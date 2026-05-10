---
title: HTTP API
description: 当前 v1.0 HTTP API 行为、认证方式、响应 envelope、受保护路由和 endpoint groups。
---

Plystra Core 暴露 `/api/v1` HTTP API。OpenAPI 文件位于 Core 仓库：

```text
openapi/plystra.v1.0.0.yaml
openapi/plystra.v1.0.0.json
```

如果你的目标是把现有应用接进来，而不是逐个浏览 endpoint，先看 [接入你的应用](/zh/guides/integrate-your-app/)。那篇会先给完整对象创建和后端保护流程，本页更适合作为 API 参考。

## 响应 envelope

单对象成功响应：

```json
{
  "data": {},
  "meta": {
    "request_id": "req_..."
  },
  "request_id": "req_..."
}
```

列表响应包含 pagination：

```json
{
  "data": [],
  "pagination": {
    "limit": 50,
    "cursor": null,
    "has_more": false
  },
  "meta": {
    "request_id": "req_..."
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
  "meta": {
    "request_id": "req_..."
  },
  "request_id": "req_..."
}
```

API 接受 `X-Request-ID`。未提供时，middleware 会生成 request ID。

## 认证层

| 层级 | 适用范围 | 机制 |
|---|---|---|
| 公开运维路由 | health、ready、version | 不需要 token。 |
| Session auth | login、refresh、logout、actor context、switch-member | 使用登录凭据和 opaque bearer token，token 以 HMAC hash 存储。 |
| Admin grant protection | 非公开 Core API | 需要拥有 active admin grant 的用户 `Authorization: Bearer <access_token>`。 |
| API key protection | 服务端调用非公开 Core API | 使用 `X-Plystra-API-Key: <api_key>` 或 `Authorization: Bearer ply_ak_...`。API key 带 scope 和 permission key。 |
| Metrics token | 启用后的 `/metrics` | 需要 `METRICS_TOKEN` / `PLYSTRA_METRICS_TOKEN`，或拥有 `metrics:read` 的 Bearer session。 |

受保护路由没有有效 session 或 API key 时返回 `AUTHENTICATION_REQUIRED`。凭证缺少所需权限时返回 `ADMIN_PERMISSION_REQUIRED`。

## 公开路由

| Method | Path |
|---|---|
| `GET` | `/api/v1/health` |
| `GET` | `/api/v1/ready` |
| `GET` | `/api/v1/version` |
| `GET` | `/api/v1/system/health` |
| `GET` | `/api/v1/system/ready` |
| `GET` | `/api/v1/system/version` |
| `GET` | `/system/health` |
| `GET` | `/system/ready` |
| `GET` | `/system/version` |

`/metrics` 会进入公开路由分支，让 handler 自己返回 `FEATURE_DISABLED` 或验证 metrics token。默认关闭。

## Session 路由

| Method | Path | 说明 |
|---|---|---|
| `POST` | `/api/v1/auth/login` | 接收 `email` 和 `password`；返回 access/refresh tokens。 |
| `POST` | `/api/v1/auth/refresh` | 接收 `refresh_token`；同时轮换 access token 和 refresh token。 |
| `POST` | `/api/v1/auth/logout` | 使用 bearer access token 或 body refresh token 撤销 session。 |
| `GET` | `/api/v1/actor/context` | 需要 access token。返回当前 actor 和 available members。 |
| `POST` | `/api/v1/actor/switch-member` | 需要 access token。切换 active Member/UserMember binding。 |

登录失败会按标准化 email 和来源 IP 做限速。新密码使用 Argon2id 存储；旧 PBKDF2 hash 仍可登录，并会在成功登录后升级。修改 User 密码会撤销该 User 的现有 sessions。

本地开发种子账号：

```text
alice@example.com / plystra-demo
bob@example.com / plystra-demo
```

## 授权路由

| Method | Path | 说明 |
|---|---|---|
| `POST` | `/api/v1/authz/check` | 执行决策并写 audit。 |
| `POST` | `/api/v1/authz/explain` | 与 check 相同，但开启 explain。 |

示例：

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

HTTP authz 会忽略 body 中的 `request_id`、`ip`、`user_agent`，以服务端值为准。

## Core 管理路由

本节所有路由都需要 `Authorization: Bearer <access_token>` 加 active admin grant，或 `X-Plystra-API-Key: <api_key>` 加匹配的 API key 权限。用户 session 中 `instance_super_admin` 拥有所有权限；`instance_admin` 按 permission key 授权；`space_admin` 限定单个 Space；`group_admin` 限定一个 Group 子树。API key 使用 `instance`、`space`、`group` scope。

| Group | Routes |
|---|---|
| Admin grants | `GET /api/v1/admin/me`、`GET/POST /api/v1/admin/grants`、`GET /api/v1/admin/grants/{id}`、`POST /api/v1/admin/grants/{id}/revoke` |
| API keys | `GET/POST /api/v1/api-keys`、`GET /api/v1/api-keys/{id}`、`POST /api/v1/api-keys/{id}/revoke` |
| Overview | `GET /api/v1/console/overview` |
| AuditLog | `GET /api/v1/audit-logs`、`GET /api/v1/audit-logs/{id}`，以及 legacy `/api/v1/audit/logs` aliases |
| Resource Registry | `GET/POST /api/v1/resource-types`，`GET /api/v1/resource-types/{key}`，`GET/POST /api/v1/resource-types/{key}/actions`，`GET/POST/PATCH/PUT /api/v1/resource-types/{key}/mapping` |
| Users | `GET/POST /api/v1/users`，`GET/PATCH /api/v1/users/{id}`，`POST /api/v1/users/{id}/disable`，`POST /api/v1/users/{id}/restore` |
| Spaces | `GET/POST /api/v1/spaces`，`GET/PATCH /api/v1/spaces/{id}`，`POST /api/v1/spaces/{id}/disable`，`POST /api/v1/spaces/{id}/restore` |
| Space 嵌套对象 | `/api/v1/spaces/{space_id}/groups`、`/members`、`/user-members`、`/roles`、`/member-roles`、`/member-role-grants`、`/resources`、`/audit-logs` |
| Direct details | `GET /api/v1/groups/{id}`、`GET /api/v1/members/{id}`、`GET /api/v1/user-members/{id}`、`GET /api/v1/roles/{id}` |
| Permissions | `GET/POST /api/v1/permissions`、`GET/PATCH /api/v1/permissions/{id}`、`POST /api/v1/permissions/{id}/disable` |
| Role permissions | `GET/POST /api/v1/role-permissions`、`GET/DELETE /api/v1/role-permissions/{id}` |
| Resources | `GET/POST /api/v1/resources`、`GET /api/v1/resources/{resource_type}/{resource_id}` |
| Plugins | `POST /api/v1/plugins/validate-manifest`、`POST /api/v1/plugins/install`、`GET /api/v1/plugins`、`GET /api/v1/plugins/{key}`、lifecycle 和 metadata subroutes |
| Templates | `GET /api/v1/templates`、`GET /api/v1/templates/{id}`、`POST /api/v1/templates/{id}/preview-install`、`POST /api/v1/templates/{id}/install` |

User 响应已做脱敏，不返回 `password_hash`。

创建 API key 时明文 `api_key` 只返回一次，请保存到 secret manager。Core 只存 HMAC hash。创建 key 所需权限是 `api_keys:create`；读取、撤销和管理分别使用 `api_keys:read`、`api_keys:revoke`、`api_keys:manage`。

## Data Console preview 路由

Data Console 不是 v1.0 blocking surface，默认关闭：

```text
DATA_CONSOLE_ENABLED=false
```

启用并通过 Bearer user session 保护后：

| Method | Path |
|---|---|
| `GET` | `/api/v1/data/tables` |
| `GET/POST` | `/api/v1/data/rows/{resource_type}` |
| `GET/PATCH/DELETE` | `/api/v1/data/rows/{resource_type}/{resource_id}` |

当前 mutation 只支持 Core `resources` 表支持的 `internal_table` mapping。Mutation 会运行授权检查，并返回变更后的 row 和 authorization decision。

## Metrics

Metrics 默认关闭：

```text
METRICS_ENABLED=false
```

启用后，`/metrics` 返回 Prometheus text，并要求 metrics token 或拥有 `metrics:read` 的 Bearer session。
