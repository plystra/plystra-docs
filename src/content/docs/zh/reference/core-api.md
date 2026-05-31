---
title: Core API 参考
description: Plystra Core v1.0 HTTP API 的响应 envelope、认证 scheme、endpoint groups 和生成的 OpenAPI artifacts。
---

Core API 统一使用 `/api/v1` 前缀，并返回 JSON envelope。当前 docs build 发布的 OpenAPI artifacts：

- [OpenAPI JSON](/openapi/plystra.v1.0.0.json)
- [OpenAPI YAML](/openapi/plystra.v1.0.0.yaml)

在 Core 仓库重新生成：

```bash
make openapi
```

生成文件位于 `plystra/plystra/openapi/plystra.v1.0.0.{json,yaml}`。

## Security Schemes

| Scheme | Header | 用途 |
|---|---|---|
| `BearerAuth` | `Authorization: Bearer <access_token>` | User session 和 admin/operator 调用。 |
| `ApiKeyAuth` | `X-Plystra-API-Key: <api_key>` | 服务端到服务端调用，以及 Context Mode inline 授权。 |
| `MetricsTokenAuth` | `X-Plystra-Metrics-Token: <token>` | 配置 metrics token 后访问 `/metrics`。 |

Core 也接受 `Authorization: Bearer ply_ak_...` 形式的 API key，方便不适合自定义 header 的环境。

## Public System

| Method | Path |
|---|---|
| `GET` | `/api/v1/health` |
| `GET` | `/api/v1/ready` |
| `GET` | `/api/v1/version` |
| `GET` | `/metrics` |

`/metrics` 默认关闭。启用后需要 metrics token，或拥有 `metrics:read` 的 principal。

## Native Session Auth

| Method | Path |
|---|---|
| `POST` | `/api/v1/auth/register` |
| `POST` | `/api/v1/auth/login` |
| `POST` | `/api/v1/auth/refresh` |
| `POST` | `/api/v1/auth/logout` |
| `GET` | `/api/v1/actor/context` |
| `POST` | `/api/v1/actor/switch-member` |

Core 注册有意保持受限，默认关闭。Complete Auth plugin 路由见 [Complete Auth Plugin](/zh/reference/complete-auth-plugin/)。

## Admin And API Keys

| Method | Path |
|---|---|
| `GET` | `/api/v1/admin/me` |
| `GET`, `POST` | `/api/v1/admin/grants` |
| `GET` | `/api/v1/admin/grants/{admin_grant_id}` |
| `POST` | `/api/v1/admin/grants/{admin_grant_id}/revoke` |
| `GET`, `POST` | `/api/v1/api-keys` |
| `GET` | `/api/v1/api-keys/{api_key_id}` |
| `POST` | `/api/v1/api-keys/{api_key_id}/revoke` |

这些路由的防提权规则是控制面安全边界。详见 [Admin Auth 与安全边界](/zh/reference/admin-auth-and-security/)。

## Authorization

| Method | Path |
|---|---|
| `POST` | `/api/v1/authz/check` |
| `POST` | `/api/v1/authz/explain` |

Managed-mode request：

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

Context Mode request：

```json
{
  "actor": {
    "user_id": "user_external_alice",
    "member_id": "member_finance_reviewer",
    "binding_id": "binding_external_alice_finance",
    "space_id": "space_acme"
  },
  "resource": {
    "type": "invoice",
    "external_id": "invoice_001",
    "space_id": "space_acme",
    "group_path": "finance.apac",
    "owner_member_id": "member_invoice_creator"
  },
  "grants": [{
    "role_key": "finance_approver",
    "resource": "invoice",
    "action": "approve",
    "scope": "group_tree",
    "space_id": "space_acme",
    "scope_anchor_group_path": "finance"
  }],
  "action": "approve",
  "explain": true
}
```

Inline actor、resource 和 grant 字段是可信服务端输入。只有 API key 调用可以使用 inline context。不要把浏览器提交的 actor、ownership、grant 和 scope 字段直接转发给 Plystra。

Decision response 包含 `allow`、`decision`、`deny_code`、`reason`、`trace_id`、`audit_log_id` 和 `audit` snapshot。

## Identity And Scope Objects

| 对象 | Routes |
|---|---|
| Users | `GET/POST /api/v1/users`，`GET/PATCH /api/v1/users/{user_id}`，disable，restore |
| Spaces | `GET/POST /api/v1/spaces`，`GET/PATCH /api/v1/spaces/{space_id}`，disable，restore |
| Groups | `GET /api/v1/groups/{group_id}`，Space 嵌套 group list/create/detail/update/disable/tree |
| Members | `GET /api/v1/members/{member_id}`，Space 嵌套 member list/create/detail/update/disable |
| UserMembers | `GET /api/v1/user-members/{user_member_id}`，Space 嵌套 binding list/create/detail/update/revoke |
| Roles | `GET /api/v1/roles/{role_id}`，Space 嵌套 role list/create/detail/update/disable |
| MemberRoles | Space 嵌套 member-role list/create/detail/revoke |
| Permissions | permission list/create/detail/update/disable 和 role-permission list/create/detail/delete |

这些资源构成 canonical identity chain：

```text
User -> UserMember -> Member -> Space
```

## Resource Registry And Resources

| Method | Path |
|---|---|
| `GET`, `POST` | `/api/v1/resource-types` |
| `GET` | `/api/v1/resource-types/{resource_type}` |
| `GET`, `POST` | `/api/v1/resource-types/{resource_type}/actions` |
| `GET`, `POST`, `PATCH`, `PUT` | `/api/v1/resource-types/{resource_type}/mapping` |
| `GET`, `POST` | `/api/v1/resources` |
| `GET` | `/api/v1/resources/{resource_type}/{resource_id}` |
| `GET`, `POST` | `/api/v1/spaces/{space_id}/resources` |
| `GET`, `PATCH` | `/api/v1/spaces/{space_id}/resources/{resource_id}` |
| `POST` | `/api/v1/spaces/{space_id}/resources/{resource_id}/archive` |

Resource Registry 会在授权前验证 resource type/action 是否存在，并把 risk 与默认审计策略写入 decision trace。

## Audit

| Method | Path |
|---|---|
| `GET` | `/api/v1/audit/logs` |
| `GET` | `/api/v1/audit/logs/{audit_log_id}` |
| `GET` | `/api/v1/spaces/{space_id}/audit-logs` |
| `GET` | `/api/v1/spaces/{space_id}/audit-logs/{audit_log_id}` |

Audit logs 是 append-only，并保存 trace snapshot，保证历史解释可读。

## Preview Extension Surfaces

| Surface | Routes | 状态 |
|---|---|---|
| Plugin metadata | `/api/v1/plugins`、`/api/v1/plugins/install`、`/api/v1/plugins/validate-manifest`、plugin subroutes | Preview metadata 和 lifecycle flags；不是稳定 hot-loaded plugin runtime。 |
| Template metadata | `/api/v1/templates`、template detail、preview-install、install | Preview manifest/admin metadata。Backend OS Alpha scaffold 使用 `plystractl templates create`。 |
| Data Console | `/api/v1/data/tables`、`/api/v1/data/rows/{resource_type}`、row detail/mutation routes | Feature-flagged preview，默认关闭。 |

## Deny Codes

常见授权拒绝码：

| Code | 含义 |
|---|---|
| `ACTOR_USER_INACTIVE` | User 非 active。 |
| `ACTOR_MEMBER_INACTIVE` | Member 非 active。 |
| `USER_MEMBER_REVOKED` | UserMember 或兼容 binding 非 active。 |
| `USER_MEMBER_EXPIRED` | Binding 已过期。 |
| `SPACE_INACTIVE` | Actor Space 非 active。 |
| `CROSS_SPACE_VIOLATION` | Actor、target、grant 或 scope anchor 的 Space 不一致。 |
| `NO_MATCHING_PERMISSION` | 没有 grant 匹配 resource/action。 |
| `SCOPE_ANCHOR_MISSING` | group 或 group_tree grant 缺少 anchor。 |
| `TARGET_GROUP_MISSING` | group-scoped decision 缺少 target group。 |
| `SCOPE_OUT_OF_BOUNDS` | 匹配 grant 不覆盖目标。 |
| `GLOBAL_SCOPE_DISABLED` | global scope 保留但禁用。 |
| `INVALID_RESOURCE_TYPE` | resource type 未注册。 |
| `INVALID_RESOURCE_ACTION` | action 未注册到 resource type。 |
