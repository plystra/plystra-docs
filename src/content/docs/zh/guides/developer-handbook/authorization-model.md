---
title: 授权模型
description: 理解 authz 请求契约、决策语义、deny code 和 scope 规则。
---

## 选择正确凭证

每条调用链只选择一种凭证模式。

| 场景 | 凭证 | 存放位置 | 要点 |
|---|---|---|---|
| 用户驱动的 Core 管理后台 | `/api/v1/auth/login` 返回的 Bearer access token | 加密的服务端 session 或后端 token store。 | 该 User 必须有 active `AdminGrant`。 |
| 业务后端做授权检查 | scoped API key | Secret manager、环境注入、workload secret。 | 必须包含 `authz:check`；API key 调用必须传 `actor`。 |
| 后端自动化管理任务 | scoped API key | Secret manager。 | 只给必要 permission key 和 scope。 |
| 一次性 bootstrap 或本地 demo | 密码登录 | 仅限本地开发。 | SDK 保留密码登录能力，但不建议常规后端路径反复使用密码。 |
| 浏览器或移动端直连 | 不使用 API key | 不要在客户端保存 API key。 | 客户端应该请求你的后端，由后端调用 Plystra。 |

## 授权请求契约

规范 HTTP 请求：

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

字段要求：

| 字段 | 何时必填 | 含义 |
|---|---|---|
| `actor.user_id` | API key 调用必填；Bearer session 可省略。 | 真实登录或审计 User。 |
| `actor.member_id` | API key 调用必填；Bearer session 可省略。 | Space 内实际行动的业务身份。 |
| `actor.user_member_id` | API key 调用必填；Bearer session 可省略。 | 证明 User 可以通过 Member 行动的 active binding。 |
| `actor.space_id` | API key 调用必填；Bearer session 可省略。 | 租户边界。 |
| `resource_type` | 必填，除非使用 `resource.type`。 | 已注册的资源类型 key。 |
| `resource_id` | 必填，除非使用 `resource.id`。 | Core resource id。 |
| `action` | 必填。 | 资源类型下注册的 action key。 |

Bearer session 调用可以省略 `actor`，Core 会使用登录或 `POST /api/v1/actor/switch-member` 选中的 session active actor。

API key 调用必须传 `actor`，因为机器 key 不能代表具体人类身份。

HTTP authz 请求不能在 body 中传 `request_id`、`ip`、`user_agent`。这些 canonical 值由 middleware 和 HTTP request 派生。

## 决策语义

只有以下条件全部成立，Core 才会 allow：

1. `User` 存在且 active。
2. `Space` 存在且 active。
3. `Member` 存在、active，并属于同一个 Space。
4. `UserMember` 存在、active，属于同一个 User、Member、Space，并且没有过期或撤销。
5. 资源类型和 action 已注册且 active。
6. 目标资源存在且 active。
7. 目标资源和 actor 属于同一个 Space。
8. 至少一个 active role grant 给该 Member 匹配的 Permission。
9. Permission scope 覆盖目标资源。

常见 deny code：

| Code | 常见原因 | 修复方向 |
|---|---|---|
| `ACTOR_NOT_FOUND` | actor id 解析失败。 | 检查 User、Member、UserMember、Space id。 |
| `USER_INACTIVE` | User 被 disabled 或 deleted。 | 恢复 User 或换 User。 |
| `USER_MEMBER_REVOKED` | Binding 被撤销、disabled 或过期。 | 创建或恢复 active UserMember。 |
| `SPACE_MISMATCH` | actor 和资源在不同 Space。 | 不要跨租户授权。 |
| `RESOURCE_NOT_FOUND` | resource row 缺失或 inactive。 | 创建或恢复资源。 |
| `NO_MATCHING_PERMISSION` | 没有 active Role/Permission candidate 匹配 resource 和 action。 | 创建 Permission 并授予 Role。 |
| `SCOPE_OUT_OF_BOUNDS` | Role 存在，但 anchor group 不覆盖目标 group。 | 调整资源 group、调整 anchor，或创建更合适的 grant。 |
| `GLOBAL_SCOPE_DISABLED` | v1.0 禁用 `global` scope。 | 使用 `space`、`group_tree` 或 `self`。 |

## Scope 规则

| Permission scope | 覆盖范围 | 要求 |
|---|---|---|
| `space` | actor Space 内任意目标资源。 | actor 和资源必须同 `space_id`。 |
| `group_tree` | 目标 group 等于 anchor group，或是其子孙。 | `MemberRole.scope_anchor_group_id` 和目标 `group_id`。 |
| `self` | 目标资源 owner 等于 actor Member。 | Resource mapping 必须暴露 `owner_member_id`。 |
| `global` | v1.0 禁用。 | 生产不要使用。 |

`group_tree` 使用安全路径规则：

```text
target_path = anchor_path OR target_path starts with anchor_path + "."
```

所以 `finance` 覆盖 `finance.apac`，但不覆盖 `financeops`。
