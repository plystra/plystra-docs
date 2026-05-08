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

审计日志是安全边界的一部分，`/api/v1/audit-logs` 默认需要 `X-Plystra-Admin-Token`。业务系统不要依赖当前角色名称来解释历史记录，应读取审计中的 trace 快照。
