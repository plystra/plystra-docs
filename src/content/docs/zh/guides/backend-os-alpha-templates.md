---
title: Backend OS Alpha Templates
description: 可检查 template scaffolds、当前 template catalog、生成文件和生产边界。
---

Backend OS Alpha 是 alpha 验证路径，不是 cloud marketplace。它验证一个 small-to-medium application 能否通过 Core 加官方插件完成 scaffold、检查、启动、备份和升级。

Alpha 体验使用 CLI scaffold path：

```bash
cd plystra/plystra
go run ./cmd/plystractl templates list
go run ./cmd/plystractl templates describe auth-ready-saas
go run ./cmd/plystractl templates create --template auth-ready-saas --name "Acme SaaS" --out ./acme-saas
```

## Template Catalog

| Template | 用途 | Required plugins | Required capabilities |
|---|---|---|---|
| `blank` | 最小 production-alpha Core baseline。 | none | none |
| `internal-admin` | 带 API key governance 和 webhook metadata requirements 的内部运营 backend。 | `plystra.api_keys`、`plystra.webhooks` | `api_key.credential` standard |
| `community-lite` | 带 moderation-oriented groups、roles 和 permissions 的小型社区 backend。 | `plystra.moderation` | none |
| `auth-ready-saas` | Core 加 Complete Auth 和 transactional email 的小型 SaaS backend。 | `plystra.auth_complete` | `email.transactional` standard |

## 生成文件

`templates create` 会写入可检查应用目录：

| 文件 | 用途 |
|---|---|
| `README.md` | 生成应用的 operator instructions。 |
| `.env.example` | 生产导向配置模板，只包含 placeholder secrets。 |
| `docker-compose.yml` | Core、PostgreSQL 和选中官方 plugin sidecars。 |
| `plystra/template-installation.json` | Template manifest、deployment profile、preview、required plugins 和 capability requirements。 |
| `plystra/install-explanation.md` | 对 template 声明和需要 review 的内容做可读解释。 |

Generator 永远不会写入真实 secrets，不会自动应用 migrations，也不会创建第一个 instance super admin。

## Deployment Profile

当前 alpha profile 假设：

- 一个 Plystra Core container。
- template 选择的官方 plugin sidecars。
- production alpha 使用 external PostgreSQL 16+。
- startup 前执行 versioned migrations。
- 非敏感可变 plugin settings 存入数据库表。
- secrets 和 process bootstrap values 由环境变量或 secret manager 提供。
- health checks 使用 `/api/v1/health`、`/api/v1/ready` 和 plugin `/health` routes。
- 备份使用 PostgreSQL dump 加 runtime config/secret-manager export。

## Production Checklist

把生成模板当成 production-ready 前：

1. 检查每个生成文件。
2. 替换所有 placeholder secrets。
3. 配置 production `SERVER_PUBLIC_URL` 和显式 CORS origins。
4. 应用并验证 Core migrations。
5. 应用选中 plugin migrations。
6. 显式 bootstrap 第一个 instance super admin。
7. 配置 required capability providers。
8. 运行 `plystractl doctor`。
9. Smoke test health、ready、login、API key creation、`authz/check`、audit logs 和选中 plugin health routes。
10. 在 staging 测试 backup 和 restore。

## Auth Ready SaaS Notes

`auth-ready-saas` 需要 Complete Auth plugin 和 `email.transactional`。

生产邮件配置：

```text
plugin_auth_settings.email_delivery_mode = capability
plugin_auth_settings.email_capability_url = https://...
plugin_auth_settings.email_from_address = no-reply@example.com
```

然后运行 SMTP provider 或 Cloudflare Email Sending provider，作为实现 `POST /contract/v1/email/send` 的独立服务。

## Alpha Boundaries

Backend OS Alpha 不包含：

- cloud hosting。
- template marketplace。
- third-party plugin trust model。
- advanced plugin sandboxing。
- plugin upgrade automatic rollback。
- 生成文件中的 hidden production secrets。

Alpha 的重点是 inspectability：开发者在运行前能看到 scaffold 精确需要什么。
