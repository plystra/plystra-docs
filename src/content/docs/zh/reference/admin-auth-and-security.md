---
title: Admin Auth 与安全边界
description: Plystra Core 管理 API、用户 session、AdminGrant、scoped API key 和防提权规则的精确说明。
---

本文说明 `1.0.0-rc5` 当前 Core 管理权限模型。这里是控制面安全边界，因此所有规则都写得很明确。

## 核心规则

Plystra Core 没有 admin token。每个非公开管理路由必须由以下凭证之一授权：

| 凭证 | Header | Principal | 用途 |
|---|---|---|---|
| User access token | `Authorization: Bearer <access_token>` | 拥有 active `AdminGrant` 的 `User`。 | 人类管理后台、运维、用户驱动的管理流程。 |
| API key | `X-Plystra-API-Key: <api_key>` 或 `Authorization: Bearer ply_ak_...` | 带显式 permission key 的 scoped `ApiKey`。 | 服务到服务自动化和授权检查。 |

公开路由仅限 health、ready、version、login、refresh、logout、actor context、actor switch-member，以及 disabled/protected metrics handler。敏感 API 不应该匿名访问。

## AdminGrant Level

| Level | Scope 字段 | 覆盖范围 | 说明 |
|---|---|---|---|
| `instance_super_admin` | 无 `space_id`、无 `group_id` | 整个实例和所有 permission key。 | 只有 user session 会被视为 super admin。API key 永远不是 super admin。 |
| `instance_admin` | 无 `space_id`、无 `group_id` | 整个实例内匹配的 `permission_key`。 | 不能创建或撤销 instance-level grant，除非同一个 User 同时是 super admin。 |
| `space_admin` | 必须有 `space_id` | 精确匹配该 Space 内的 permission key。 | 不能看或改 instance-level AdminGrant / instance API key。 |
| `group_admin` | 必须有 `group_id`；`space_id` 从 group 解析 | 匹配 permission key 且限定在 group subtree。 | 不覆盖 sibling group 或 whole-space list。 |

AdminGrant 只有同时满足以下条件才 active：

- `status = active`
- `deleted_at IS NULL`
- `revoked_at IS NULL`
- `expires_at IS NULL OR expires_at > now`

关联 User 也必须保持 active。

## API Key Level

| Level | Scope 字段 | 覆盖范围 |
|---|---|---|
| `instance` | 无 `space_id`、无 `group_id` | 整个实例内匹配的 permission key。 |
| `space` | 必须有 `space_id` | 精确匹配该 Space 内的 permission key。 |
| `group` | 必须有 `group_id`；`space_id` 从 group 解析 | 匹配 permission key 且限定在 group subtree。 |

API key 只有同时满足以下条件才 active：

- `status = active`
- `deleted_at IS NULL`
- `revoked_at IS NULL`
- `expires_at IS NULL OR expires_at > now`
- 提交的明文 token HMAC 后匹配数据库 `key_hash`

Core 只保存 API key 的 HMAC hash。明文 key 只在创建时返回一次。

## Permission Key 匹配

Permission key 使用小写 `domain:action`。

| Grant key | 匹配的 required key |
|---|---|
| `*` | 任意 key。 |
| 精确 key，例如 `users:read` | 同一个 key。 |
| `domain:*` | 该 domain 下所有 action。 |
| `domain:manage` | 该 domain 下所有 action，包括 read、create、revoke 和其他 domain-specific action。 |

非法 key 会被拒绝：

```text
*:read
Users:read
users
users:
users:read:extra
users:read/write
```

## 路由权限矩阵

middleware 会在 handler 执行前根据 method 和 path 解析所需 permission。

| 路由组 | 所需 permission |
|---|---|
| `GET /api/v1/console/overview` | `instance:read` |
| `POST /api/v1/authz/check` | `authz:check` |
| `POST /api/v1/authz/explain` | `authz:check` |
| `/metrics` 启用且未使用 metrics token 时 | `metrics:read` |
| `GET /api/v1/admin/me` | `instance:read` |
| `GET /api/v1/admin/grants` | `admin_grants:read` |
| `GET /api/v1/admin/grants/{id}` | `admin_grants:read`，并解析到该 grant 的 scope |
| `POST /api/v1/admin/grants` | `admin_grants:manage` |
| `POST /api/v1/admin/grants/{id}/revoke` | `admin_grants:manage`，并解析到该 grant 的 scope |
| `GET /api/v1/api-keys` | `api_keys:read` |
| `GET /api/v1/api-keys/{id}` | `api_keys:read`，并解析到该 key 的 scope |
| `POST /api/v1/api-keys` | `api_keys:create` |
| `POST /api/v1/api-keys/{id}/revoke` | `api_keys:revoke`，并解析到该 key 的 scope |
| `GET /api/v1/audit/logs` | `audit:read`，可通过 `space_id` query 限定 |
| `GET /api/v1/audit/logs/{id}` | `audit:read`，解析到 audit log 的 Space |
| `GET /api/v1/users*` | `users:read` |
| mutating `/api/v1/users*` | `users:manage` |
| `GET /api/v1/spaces*` | `spaces:read` |
| mutating `/api/v1/spaces*` | `spaces:manage` |
| `GET /api/v1/spaces/{space_id}/groups*` | Space 或解析后的 Group 上 `groups:read` |
| mutating `/api/v1/spaces/{space_id}/groups*` | Space 或解析后的 Group 上 `groups:manage` |
| `GET /api/v1/spaces/{space_id}/members*` | Space 上 `members:read` |
| mutating `/api/v1/spaces/{space_id}/members*` | Space 上 `members:manage` |
| `GET /api/v1/spaces/{space_id}/user-members*` | Space 上 `user_members:read` |
| mutating `/api/v1/spaces/{space_id}/user-members*` | Space 上 `user_members:manage` |
| `GET /api/v1/spaces/{space_id}/roles*` | Space 上 `roles:read` |
| mutating role 和 member-role 路由 | Space 上 `roles:manage` |
| `GET /api/v1/permissions*` 和 `GET /api/v1/role-permissions*` | `permissions:read` |
| mutating permission 和 role-permission 路由 | `permissions:manage` |
| `GET /api/v1/resource-types*` | `registry:read` |
| mutating resource type、action、mapping 路由 | `registry:manage` |
| `GET /api/v1/resources` | `resources:read`，可由 `space_id` query 限定 |
| `POST /api/v1/resources` | `resources:manage`，目标 scope 在 handler 中解析 |
| `GET /api/v1/resources/{type}/{id}` | `resources:read`，解析到 resource Space 和 Group |
| nested Space resource routes | Space 或解析后 Group 上 `resources:read` / `resources:manage` |
| data preview routes | `data:read` 或 `data:manage`；默认 feature disabled |
| plugin routes | `plugins:read` 或 `plugins:manage` |
| template routes | `templates:read` 或 `templates:manage` |

当 middleware 无法在读取 body 前知道目标 scope 时，handler 会再次检查目标 scope，例如 API key 创建、AdminGrant 创建、授权检查、resource mutation。

## 防提权规则

当前 handler 强制执行并有测试覆盖：

- User 只有在目标 scope 上拥有 `api_keys:create` 时才能创建 API key。
- User 只能把自己在目标 scope 上已经拥有的 permission key 委派给新 API key。
- space admin 不能创建 instance API key。
- space admin 不能创建其他 Space 的 API key。
- space admin 不能读取 instance API key。
- space admin 不能读取 instance-level AdminGrant。
- group admin 不能读取 sibling group resource。
- group admin 不能通过 group grant 列出 whole-space resources。
- 只有 user session 能创建或撤销 AdminGrant。
- API key 即使拥有 `admin_grants:manage`，也不能创建或撤销 human AdminGrant。
- 只有 instance super admin 能创建或撤销 `instance_super_admin` / `instance_admin` grant。
- Core 拒绝撤销最后一个 active `instance_super_admin` grant。
- 拥有 `*` 的 API key 不会被视为 instance super admin。

## Handler-Resolved Scope

有些 create 路由必须先通过 middleware，handler 才能解析 body 中的目标 scope。middleware 可以临时允许 scoped principal 进入以下 domain：

```text
api_keys:*
admin_grants:*
authz:check
```

这不是最终授权。handler 必须继续解析真实 `space_id`、`group_id`、resource 或 grant，并在越权时 deny。

对于已有对象，Core 会先解析对象存储的 scope 再决定可见性，因此 Space admin 不能列出或读取 instance-level API key / AdminGrant。

## Session Auth 细节

登录路由：

```http
POST /api/v1/auth/login
```

Body：

```json
{
  "email": "alice@example.com",
  "password": "plystra-demo"
}
```

响应包含：

```json
{
  "access_token": "ply_at_...",
  "refresh_token": "ply_rt_...",
  "token_type": "Bearer",
  "expires_at": "2026-05-12T01:00:00Z",
  "refresh_expires_at": "2026-06-11T01:00:00Z",
  "user": {},
  "actor": {},
  "available_members": []
}
```

当前 token 行为：

- access token TTL 为 15 分钟。
- refresh token TTL 为 30 天。
- refresh 会同时轮换 access token 和 refresh token。
- logout 通过 bearer access token 或 body refresh token 撤销 session。
- session token hash 使用 `PLYSTRA_SESSION_SECRET`。
- 密码使用 Argon2id 保存。
- 修改 User password 会撤销该 User 的已有 sessions。
- 登录按 normalized email 和 source IP 限流。

## API Key 细节

创建路由：

```http
POST /api/v1/api-keys
```

Body：

```json
{
  "name": "billing-service-prod",
  "level": "space",
  "space_id": "space_acme",
  "permission_keys": ["authz:check", "resources:read"],
  "expires_at": "2026-12-31T23:59:59Z",
  "metadata": {
    "owner": "billing-platform"
  }
}
```

响应中的 `api_key` 只返回一次：

```json
{
  "id": "ak_...",
  "name": "billing-service-prod",
  "key_prefix": "ply_ak_ak_...",
  "level": "space",
  "space_id": "space_acme",
  "permission_keys": ["authz:check", "resources:read"],
  "api_key": "ply_ak_ak_....secret"
}
```

生产处理：

- 明文 `api_key` 必须放入 secret manager。
- 不要记录明文 API key 日志。
- 使用 `PLYSTRA_API_KEY_SECRET` 做 HMAC hash。
- secret 轮换时，把旧 secret 以逗号分隔放入 `PLYSTRA_API_KEY_SECRET_PREVIOUS`。
- 用 `POST /api/v1/api-keys/{id}/revoke` 撤销旧 key。

## Session 与 API Key 的 Authz 差异

Bearer session 调用：

```json
{
  "resource_type": "invoice",
  "resource_id": "invoice_001",
  "action": "approve"
}
```

Core 使用 session active actor。

API key 调用：

```json
{
  "actor": {
    "user_id": "user_alice",
    "member_id": "member_finance_reviewer",
    "user_member_id": "um_alice_finance_reviewer",
    "space_id": "space_acme"
  },
  "resource_type": "invoice",
  "resource_id": "invoice_001",
  "action": "approve"
}
```

API key 必须包含 actor。

## 你的接入应该测试什么

至少添加这些测试：

- 预期 allow。
- 无匹配权限 deny。
- group out-of-scope deny。
- cross-space deny。
- revoked UserMember deny。
- inactive User deny。
- API key revoked deny。
- API key expired deny。
- API key 不能创建 AdminGrant。
- Space admin 不能访问其他 Space。
- Group admin 不能访问 sibling Group。

Core 自身测试已覆盖这些边界，但你的应用仍需要测试自己如何把应用用户和业务对象映射到 Plystra id。
