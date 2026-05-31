---
title: HTTP API
description: 当前 v1.0 HTTP API 行为、认证方式、响应 envelope、受保护 route groups 和扩展边界。
---

Plystra Core 暴露 `/api/v1` HTTP API。当前文档站发布生成的 OpenAPI 文件：

```text
/openapi/plystra.v1.0.0.yaml
/openapi/plystra.v1.0.0.json
```

这些文件由当前 Go API contract 通过 `swaggest/openapi-go` 生成，包含 request bodies、response envelopes、security schemes、endpoint tags 和 route groups。

如果你的目标是把现有应用接进来，而不是逐个浏览 endpoint，先看 [接入你的应用](/zh/guides/integrate-your-app/)。本页是操作层 API 指南。

## Response Envelope

单对象成功响应：

```json
{
  "data": {},
  "request_id": "req_..."
}
```

列表响应：

```json
{
  "data": [],
  "pagination": {
    "limit": 50,
    "cursor": null,
    "has_more": false
  },
  "request_id": "req_..."
}
```

错误响应：

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request body is invalid JSON.",
    "details": null,
    "request_id": "req_..."
  },
  "request_id": "req_..."
}
```

API 接受 `X-Request-ID`。未提供时，middleware 会生成 request ID。

## Authentication Layers

| Layer | 适用范围 | 机制 |
|---|---|---|
| Public operations | health、ready、version | 不需要 token。 |
| Session auth | login、refresh、logout、actor context、switch-member | Opaque bearer tokens；以 HMAC hash 存储。 |
| Admin grant protection | 非公开 Core API | `Authorization: Bearer <access_token>`，User 需要 active AdminGrant。 |
| API key protection | 服务端到服务端 Core API | `X-Plystra-API-Key: <api_key>` 或 `Authorization: Bearer ply_ak_...`；key 携带 scope 和 permission keys。 |
| Metrics token | 启用后的 `/metrics` | `METRICS_TOKEN` / `PLYSTRA_METRICS_TOKEN`，或拥有 `metrics:read` 的 Bearer session。 |

受保护路由没有有效凭证时返回 `AUTHENTICATION_REQUIRED`。凭证有效但缺少权限时返回 `ADMIN_PERMISSION_REQUIRED`。

## Public Routes

| Method | Path |
|---|---|
| `GET` | `/api/v1/health` |
| `GET` | `/api/v1/ready` |
| `GET` | `/api/v1/version` |

`/metrics` 会进入 public route 分支，让 handler 返回 `FEATURE_DISABLED` 或验证 metrics token。Metrics 默认关闭。

## Session Routes

| Method | Path | 说明 |
|---|---|---|
| `POST` | `/api/v1/auth/register` | 受保护 native registration。默认关闭。 |
| `POST` | `/api/v1/auth/login` | 接收 `email` 和 `password`；返回 access 和 refresh tokens。 |
| `POST` | `/api/v1/auth/refresh` | 接收 `refresh_token`；轮换 access 和 refresh tokens。 |
| `POST` | `/api/v1/auth/logout` | 通过 bearer access token 或 body refresh token 撤销。 |
| `GET` | `/api/v1/actor/context` | 需要 access token。返回 active actor 和 available members。 |
| `POST` | `/api/v1/actor/switch-member` | 需要 access token。切换 active Member/UserMember binding。 |

Core 有意只保留最小认证面：受保护注册、密码登录、session refresh/logout 和 actor context。Email verification code 和 magic-link sign-in 位于独立 Complete Auth plugin repo。该插件发送邮件时，依赖独立 email contracts repo 和 SMTP 或 Cloudflare Email Sending 等 provider plugin。

普通 Core 注册会在单个 Simple Mode 默认 Space `space_default` 内创建 User、default Member、default UserMember、session 和 Space admin grant。它不会创建 instance super admin。公开 user-only Core 注册更窄，只创建 User。

本地 demo 凭据：

```text
alice@example.com / plystra-demo
bob@example.com / plystra-demo
```

## Complete Auth Plugin Routes

这些路由属于独立 Complete Auth plugin，不属于 Core：

| Method | Path | 说明 |
|---|---|---|
| `POST` | `/api/v1/auth/email-code` | 创建短生命周期 email verification-code challenge，并通过配置的 email provider 发送。 |
| `POST` | `/api/v1/auth/email-code/verify` | 校验 6 位 code，消费 challenge；当绑定 active User 时标记 User email metadata 已验证。 |
| `POST` | `/api/v1/auth/magic-link` | 创建短生命周期 magic-link challenge，并通过配置的 email provider 发送。 |
| `POST` | `/api/v1/auth/magic-link/consume` | 消费 magic-link token，并为 active User 创建 Core-compatible session。 |

Plugin challenges 都是一次性的。插件只保存已发送 code/token 的 HMAC hash。发送和验证尝试会按 normalized email 和 source IP 限流。生产必须使用外部 email capability endpoint；development log mode 在生产会被拒绝。Magic-link `redirect_url` 必须使用 HTTPS 并匹配插件 allowlist。

Complete Auth 的非敏感运行时设置保存在 `plugin_auth_settings`，包括 public registration、delivery mode、capability URL、sender address、redirect allowlist、TTL、rate limits、max body size 和 trusted proxy CIDRs。Secrets 保持环境变量或 secret-manager values。

## Authorization Routes

| Method | Path | 说明 |
|---|---|---|
| `POST` | `/api/v1/authz/check` | 执行决策并写 audit。 |
| `POST` | `/api/v1/authz/explain` | 执行相同决策路径，并返回完整 explain output。 |

Managed-mode request 示例：

```bash
curl -X POST http://localhost:8080/api/v1/authz/check \
  -H "Content-Type: application/json" \
  -H "X-Plystra-API-Key: $PLYSTRA_API_KEY" \
  -d '{
    "actor": {
      "user_id": "user_alice",
      "member_id": "member_finance_reviewer",
      "user_member_id": "um_alice_finance_reviewer",
      "space_id": "space_acme"
    },
    "resource_type": "invoice",
    "resource_id": "invoice_001",
    "action": "approve"
  }'
```

HTTP authz 会忽略 body 中的 canonical request metadata，例如 `request_id`、`ip` 和 `user_agent`。Core 从请求和 middleware 派生这些值。

API key 调用必须包含嵌套 `actor`。Bearer session 调用可以省略 `actor`；Core 会使用 session active actor。

## Core Management Route Groups

以下 route groups 都需要 `Authorization: Bearer <access_token>` 加 active AdminGrant，或 `X-Plystra-API-Key: <api_key>` 加匹配 permission keys。

| Group | Routes |
|---|---|
| Admin grants | `GET /api/v1/admin/me`、`GET/POST /api/v1/admin/grants`、`GET /api/v1/admin/grants/{id}`、`POST /api/v1/admin/grants/{id}/revoke` |
| API keys | `GET/POST /api/v1/api-keys`、`GET /api/v1/api-keys/{id}`、`POST /api/v1/api-keys/{id}/revoke` |
| Overview | `GET /api/v1/console/overview` |
| AuditLog | `GET /api/v1/audit/logs`、`GET /api/v1/audit/logs/{id}` 和 Space-scoped variants |
| Resource Registry | `GET/POST /api/v1/resource-types`、resource type detail、actions 和 mapping routes |
| Users | `GET/POST /api/v1/users`、detail、update、disable、restore |
| Spaces | `GET/POST /api/v1/spaces`、detail、update、disable、restore |
| Space nested objects | `/api/v1/spaces/{space_id}/groups`、`/members`、`/user-members`、`/roles`、`/member-roles`、`/resources`、`/audit-logs` |
| Direct details | `GET /api/v1/groups/{id}`、`GET /api/v1/members/{id}`、`GET /api/v1/user-members/{id}`、`GET /api/v1/roles/{id}` |
| Permissions | `GET/POST /api/v1/permissions`、detail/update/disable，以及 `role-permissions` binding routes |
| Resources | `GET/POST /api/v1/resources`、`GET /api/v1/resources/{resource_type}/{resource_id}` |
| Plugin metadata preview | manifest validation、metadata install、lifecycle flags、settings、resources、permissions、audit events、admin menus |
| Template metadata preview | catalog、detail、preview-install、install metadata routes |

完整 path list 见 [Core API 参考](/zh/reference/core-api/)。Route permission matrix 和防提权规则见 [Admin Auth 与安全边界](/zh/reference/admin-auth-and-security/)。

创建 API key 时明文 `api_key` 只返回一次。Core 只保存 HMAC hash。

## Data Console Preview

Data Console 不是稳定 Core blocking surface，默认关闭：

```text
DATA_CONSOLE_ENABLED=false
```

显式启用并通过 Bearer session/API key 权限保护后：

| Method | Path |
|---|---|
| `GET` | `/api/v1/data/tables` |
| `GET/POST` | `/api/v1/data/rows/{resource_type}` |
| `GET/PATCH/DELETE` | `/api/v1/data/rows/{resource_type}/{resource_id}` |

当前 mutations 支持通过 `internal_table` resource mappings 访问 Core `resources` 表。Mutations 会运行授权检查，并返回变更后的 row 和 authorization decision。

## Metrics

Metrics 默认关闭：

```text
METRICS_ENABLED=false
```

启用后，`/metrics` 返回 Prometheus text，并要求 metrics token 或拥有 `metrics:read` 的 Bearer session。

## Preview Boundary

Core 中的 plugin 和 template HTTP routes 是 preview metadata surfaces。它们不表示 stable hot-loaded plugin runtime、third-party marketplace、cloud hosting 或完整 capability certification system 已经实现。Backend OS Alpha 使用 `plystractl templates create` 作为可检查 scaffold path；HTTP template routes 仍用于 manifest、preview 和 admin metadata APIs。
