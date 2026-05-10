---
title: 数据库与迁移
description: Ent schema ownership、PostgreSQL migrations、CLI checks 和 v1.0 表分组。
---

Plystra v1.0 使用 Ent 作为 Go 侧 canonical schema model，同时使用版本化 SQL migrations 作为生产升级边界。

```text
ent/schema        -> typed Core schema model
ent/              -> generated code
migrations/       -> ordered production migration history
plystractl        -> migration, Ent drift, doctor checks
```

## 核心规则

生产升级必须使用：

```bash
go run ./cmd/plystractl migrate up
```

不要把 Ent auto migration 当作生产升级机制。

## 必需检查

```bash
go run ./cmd/plystractl migrate verify
go run ./cmd/plystractl ent check
go run ./cmd/plystractl doctor
```

这些检查会验证 migration state、Ent/database 对齐、配置、数据库连接、schema readiness 和 service readiness。

## Maintainer 的 Ent workflow

修改 `ent/schema` 后：

```bash
go generate ./ent
go test ./...
go run ./cmd/plystractl ent check
```

schema 变更、generated code 和 migration files 必须一起提交。

## v1.0 migration history

当前 Core migration set 包含：

| Migration | 目的 |
|---|---|
| `001_finance_demo` | Finance Reviewer 种子数据和基础授权模型。 |
| `002_resource_registry` | Resource types、actions、mappings 和 registry metadata。 |
| `003_plugin_api_preview` | Plugin metadata preview tables。 |
| `004_production_readiness` | Production readiness 支持。 |
| `005_official_plugins_and_templates` | First-party plugin/template metadata。 |
| `006_data_console_mutations` | Data Console preview mutation 支持。 |
| `007_auth_sessions` | Opaque session storage。 |
| `008_restore_database_defaults` | 恢复现有 schema 的数据库 defaults。 |
| `009_ent_v1_integration_guardrails` | Ent integration guardrails。 |
| `010_v1_core_required_fields` | v1.0 required field 对齐。 |
| `011_ent_v1_type_alignment` | Ent type 对齐。 |
| `012_ent_v1_empty_database_drift_closure` | Empty database Ent drift closure。 |
| `013_user_admin_grants` | 基于 User/session 的管理员授权。 |
| `014_authn_hardening` | Native auth 密码生命周期和登录审计元数据。 |

## 一等实体分组

| 分组 | Tables |
|---|---|
| Identity | `users`、`members`、`user_members`、`sessions` |
| Admin control plane | `admin_grants` |
| Tenant structure | `spaces`、`groups` |
| Authorization | `roles`、`member_roles`、`permissions`、`role_permissions` |
| Resources | `resources`、`resource_types`、`resource_actions`、`resource_mappings` |
| Audit | `audit_logs`、`audit_event_types` |
| Plugin metadata | `plugins`、`plugin_admin_menus`、`plugin_settings_definitions`、`plugin_settings_values` |
| Templates and jobs | `template_installations`、`background_jobs` |

`user_members`、`member_roles`、`role_permissions` 这类关键关系表都是显式实体，不是隐藏 join table。

## 安全不变量

- `AuditLog` 是 append-only，Ent 和 store guardrails 会阻止 update/delete。
- 许多管理面使用 soft-delete 或 status change。
- `MemberRole` 保留一等字段 `scope_anchor_group_id`。
- `RolePermission` 有自己的 ID 和 metadata。
- User API 响应不会暴露 `password_hash`。

## 升级流程

1. 备份 PostgreSQL。
2. 应用 migrations。
3. 验证 migrations。
4. 运行 Ent drift check。
5. 运行 doctor。
6. 重启 Core。
7. Smoke test operational endpoints、authz、Resource Registry、AuditLog、request ID 行为。

最低命令：

```bash
go run ./cmd/plystractl migrate up
go run ./cmd/plystractl migrate verify
go run ./cmd/plystractl ent check
go run ./cmd/plystractl doctor
```
