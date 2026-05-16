---
title: Core API 参考
description: Plystra Core v1.0 HTTP API 的响应 envelope、认证和主要资源。
---

Core API 统一使用 `/api/v1` 前缀。公开路由只包含健康检查、就绪检查、版本信息，以及登录/刷新这类启动必要接口。其他管理接口默认需要 Bearer user session with an active admin grant。

## 认证方式

管理接口：

```http
Authorization: Bearer <access_token>
```

会话接口：

```http
Authorization: Bearer <access_token>
```

## 响应格式

成功响应：

```json
{
  "data": {},
  "request_id": "req_..."
}
```

错误响应：

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "..."
  },
  "request_id": "req_..."
}
```

## 常用端点

- `GET /api/v1/health`
- `GET /api/v1/ready`
- `GET /api/v1/version`
- `POST /api/v1/auth/login`
- `GET /api/v1/console/overview`
- `GET|POST /api/v1/users`
- `GET|POST /api/v1/spaces`
- `GET|POST /api/v1/resource-types`
- `GET|POST /api/v1/permissions`
- `POST /api/v1/authz/check`
- `POST /api/v1/authz/explain`
- `GET /api/v1/audit/logs`

`/api/v1/plugins`、`/api/v1/templates` 和 `/api/v1/data` 在当前 Core API 中属于 preview metadata 或 feature-flagged surface，不代表稳定 plugin runtime、第三方 marketplace、Data Console 生产 surface 或 template ecosystem。

## Authorization Context Mode

`POST /api/v1/authz/check` 和 `POST /api/v1/authz/explain` 支持两种模式。

托管模式从 Plystra Core 表中加载 actor、目标资源和权限授权：

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

Context Mode 允许可信后端 inline 传入 actor、resource 和可选 grants：

```json
{
  "actor": {
    "user_id": "user_external_alice",
    "member_id": "member_finance_reviewer",
    "binding_id": "binding_external_alice_finance",
    "space_id": "space_acme",
    "user_email": "alice@example.com"
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
  "action": "approve"
}
```

Inline context 只能用 API key。Session 调用会返回 `INLINE_CONTEXT_REQUIRES_API_KEY`。Scoped API key 会先按 inline actor/resource 的 Space 或解析到的 Group 做 `authz:check` 权限校验，然后才进入授权引擎。

响应包含 `allow`、`decision`、`deny_code`、`reason`、`trace_id`、`audit_log_id` 和 `audit`。`/authz/explain` 返回完整决策 trace。

常见 deny code：

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
| `TARGET_GROUP_MISSING` | group scope 决策缺少 target group。 |
| `SCOPE_OUT_OF_BOUNDS` | grant 存在但不覆盖目标资源。 |
| `GLOBAL_SCOPE_DISABLED` | global scope 在 v1.0 保留并禁用。 |
| `INVALID_RESOURCE_TYPE` | resource type 未注册。 |
| `INVALID_RESOURCE_ACTION` | action 未注册到 resource type。 |

## OpenAPI

OpenAPI 文件由 Core 当前 Go API contract 通过 `swaggest/openapi-go` 自动生成，包含 request body、response envelope、security scheme、endpoint tags 和分组：

```text
openapi/plystra.v1.0.0.json
openapi/plystra.v1.0.0.yaml
```

在 Core 仓库中重新生成：

```bash
make openapi
```
