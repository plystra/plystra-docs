---
title: API Key 与 AdminGrant
description: 安全创建 scoped API key，并理解管理员授权模型。
---

## 安全创建 API Key

调用方只有在目标 scope 上拥有 `api_keys:create` 时，才能创建 API key。调用方只能给新 API key 委派自己在同一目标 scope 已经拥有的 permission key。

创建 Space 级 billing service key：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/api-keys" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "ak_billing_service_prod",
    "name": "billing-service-prod",
    "level": "space",
    "space_id": "space_acme",
    "permission_keys": ["authz:check", "resources:read"],
    "expires_at": "2026-12-31T23:59:59Z"
  }'
```

响应中的 `data.api_key` 只返回一次，必须立刻放入 secret manager。

生产规则：

- 使用最窄级别：能用 `group` 就不用 `space`，能用 `space` 就不用 `instance`。
- 只授予必要 permission key。
- 生产 service key 必须设置过期时间。
- 轮换时先创建新 key，部署并确认流量正常，再 revoke 旧 key。
- 不要用 API key 创建 human admin grant。Core 会拒绝 API key 创建或撤销 AdminGrant。

## AdminGrant

AdminGrant 保护 Core 管理 API。它本身不等于业务资源权限。

| Level | Scope | 能否创建 instance admin | 常见用途 |
|---|---|---|---|
| `instance_super_admin` | 整个实例 | 可以 | bootstrap、owner、break-glass。 |
| `instance_admin` | 整个实例，但受 permission key 限制 | 不可以，除非同时是 super。 | 特定管理域的平台运维。 |
| `space_admin` | 单个 Space | 不可以 | 租户管理员。 |
| `group_admin` | 单个 Group 子树 | 不可以 | 部门或目录管理员。 |

创建一个只能在某 Space 读 users 的管理员：

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/admin/grants" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_ops",
    "level": "space_admin",
    "space_id": "space_acme",
    "permission_key": "users:read"
  }'
```

只有 user session 可以创建或撤销 AdminGrant。API key 即使拥有 `admin_grants:manage`，也不能创建或撤销 human admin grant。

Core 会阻止撤销最后一个 active instance super admin grant。

## Permission Key 规则

Permission key 是小写 `domain:action` 字符串。

合法示例：

```text
users:read
users:manage
api_keys:create
admin_grants:manage
resources:read
resources:manage
authz:check
```

匹配规则：

| Grant key | 覆盖范围 |
|---|---|
| `*` | 所有权限，只适合可信人类 instance grant。 |
| `domain:*` | domain 下所有 action。 |
| `domain:manage` | domain 下所有 action，包括 `domain:read`。 |
| 精确 key | 只覆盖该 key。 |

非法示例：

```text
*:read
Users:read
users
users:
users:read/write
users:read:extra
```
