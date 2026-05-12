---
title: 身份与作用域
description: 理解 Plystra 的 actor 模型、权限作用域、deny code 和审计 trace。
---

Plystra 的核心不变量是：登录账号不等于业务中实际行动的身份。授权会对完整 actor tuple 求值：

```text
User -> UserMember -> Member -> Space
```

## 身份对象

| 对象 | 当前 Core 中的含义 |
|---|---|
| `User` | 登录账号。保存 email、可选 username 和 phone、status、metadata，以及内部 `password_hash`。API 响应永远不返回 `password_hash`。 |
| `Member` | 某个 Space 内的业务身份。Role 授予 Member，而不是直接授予 User。 |
| `UserMember` | User 到 Member 的显式桥接关系。记录 relation type、active/revoked 状态、primary 标记、可选过期时间和撤销信息。 |
| `Space` | 租户或工作区边界。actor、grant、group 和目标 resource 必须属于同一个 Space。 |

`UserMember` 是安全关键实体。即使 Member 有匹配角色，只要 binding 被 revoked、inactive 或 expired，授权也会拒绝。

## 授权输入

HTTP API 只接受一个规范的嵌套 actor 对象。API key 调用必须显式传入它；Bearer session 调用可以省略，Core 会使用登录或 `POST /api/v1/actor/switch-member` 选中的 session active actor。

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

HTTP 请求中的 canonical request metadata 由服务端负责：

- `request_id` 来自 middleware。
- `ip` 来自服务端解析出的 remote IP 和 trusted proxy 逻辑。
- `user_agent` 来自 HTTP header。

HTTP authz request contract 不包含 body `request_id`、`ip` 或 `user_agent`。

## 作用域规则

| Scope | 规则 | 结果 |
|---|---|---|
| `self` | `resource.owner_member_id == actor.member_id` | 覆盖 active Member 拥有的资源。 |
| `group` | `target_group_id = scope_anchor_group_id` | 只覆盖精确 anchor Group。 |
| `group_tree` | `target_path = anchor_path OR target_path LIKE anchor_path || '.%'` | 覆盖 anchor Group 及其子孙组。 |
| `space` | `resource.space_id == actor.space_id` | 覆盖 active Space 内的资源。 |
| `global` | 普通 Member 禁用 | v1.0 中永远以 `GLOBAL_SCOPE_DISABLED` 拒绝。 |

`group_tree` 的规则刻意严格。anchor 为 `finance` 时覆盖 `finance` 和 `finance.apac`，但不会覆盖 `finance-old`。

## 决策顺序

当前引擎会按顺序处理：

1. 必填输入字段。
2. Actor、UserMember、Member、Space 状态。
3. Resource Registry 中的 resource type 和 action 是否有效。
4. 目标 resource 和 group 快照。
5. actor、target、grant、scope anchor 的 same-space 不变量。
6. 根据 Member、resource type、action 过滤出的 permission candidates。
7. 作用域覆盖情况。任意一个 candidate 覆盖即可 allow。
8. allow 和 deny 都写入 audit。

## Deny Codes

| Code | 含义 |
|---|---|
| `ACTOR_USER_INACTIVE` | User 非 active。 |
| `ACTOR_MEMBER_INACTIVE` | Member 非 active。 |
| `USER_MEMBER_REVOKED` | UserMember binding 非 active。 |
| `USER_MEMBER_EXPIRED` | UserMember binding 已过期。 |
| `SPACE_INACTIVE` | active Space 非 active。 |
| `CROSS_SPACE_VIOLATION` | Actor、target、grant 或 scope anchor 跨越 Space 边界。 |
| `NO_MATCHING_PERMISSION` | 没有 active role permission 匹配 resource/action。 |
| `SCOPE_ANCHOR_MISSING` | group-based grant 缺少 scope anchor。 |
| `TARGET_GROUP_MISSING` | group-based scope 求值需要的 target group 不存在。 |
| `SCOPE_OUT_OF_BOUNDS` | 存在匹配 permission，但作用域不覆盖目标。 |
| `GLOBAL_SCOPE_DISABLED` | `global` 在 v1.0 中保留但禁用。 |
| `INVALID_RESOURCE_TYPE` | resource type 未注册。 |
| `INVALID_RESOURCE_ACTION` | action 未注册到该 resource type。 |

## 审计 trace

每个授权决策都会通过 store 写入 AuditLog。Trace 包含：

- `trace_version`，当前为 `1.0`。
- User、Member、UserMember actor 快照。
- Space 和目标 resource 快照。
- Resource Registry 快照。
- 匹配的 permission candidates 和 scope checks。
- request metadata。
- 最终 decision、deny code 和 reason。

AuditLog 是 append-only。Ent hooks 和 store hooks 会阻止 update/delete。

## Resource Registry

权限不会只作为原始字符串求值。引擎会先解析：

- 已注册的 `resource_types`
- 已注册的 `resource_actions`
- `resource_mappings`

Finance Reviewer demo 注册了 `invoice`，包含 `read`、`create`、`approve`、`reject`、`delete` 等动作。`approve` 和 `reject` 是 high-risk，`delete` 是 critical。
