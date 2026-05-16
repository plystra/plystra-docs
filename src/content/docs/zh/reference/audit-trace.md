---
title: 审计 Trace
description: Plystra v1.0 授权审计日志与 trace 快照说明。
---

Plystra 会为授权决策写入追加式审计日志。审计记录描述谁通过哪条身份链路，在什么 Space 中，对哪个资源执行了什么动作，以及最终为什么 allow 或 deny。

## 核心字段

- `actor_user_id`：登录账号。
- `actor_member_id`：业务身份。
- `actor_user_member_id`：User 与 Member 的绑定。
- `space_id`：本次动作发生的 Space。
- `resource_type` / `resource_id`：目标资源。
- `action`：动作，例如 `invoice.approve`。
- `decision`：`allow` 或 `deny`。
- `deny_code`：拒绝原因，例如 `SCOPE_OUT_OF_BOUNDS`。
- `trace`：决策时的完整 JSON 快照。

## 生产规则

审计日志是安全边界的一部分，`/api/v1/audit/logs` 默认需要拥有 active admin grant 的用户 Bearer session。业务系统不要依赖当前角色名称来解释历史记录，应读取审计中的 trace 快照。

## Context Mode Trace

当 `/api/v1/authz/check` 使用 Context Mode 时，trace 保存的是可信后端传入的 actor、resource 和 grants，而不是从 Plystra 表里加载这些对象。

安全语义保持一致：

- 检查 actor User、Member、binding 和 Space 状态。
- 从 Core 加载 resource type/action registry metadata。
- 保存目标资源的 `external_id`、`space_id`、`group_path` 和 `owner_member_id`。
- inline grants 会先过滤到本次请求的 resource/action。
- 保存 scope anchor 和 scope check。
- Space 不一致时以 `CROSS_SPACE_VIOLATION` deny。
- 缺少匹配 grant 或 scope 越界时以 `NO_MATCHING_PERMISSION` 或 `SCOPE_OUT_OF_BOUNDS` deny。

Inline context 只能由 API key 凭证提交。Audit trace 证明的是可信后端向 Plystra 发送了什么上下文，不代表浏览器提交的数据天然可信。
