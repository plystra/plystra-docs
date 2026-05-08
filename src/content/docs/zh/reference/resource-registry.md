---
title: Resource Registry
description: 资源类型、动作、映射和风险元数据。
---

Resource Registry 让 Plystra 知道业务资源是什么、支持哪些动作、如何映射到内部资源记录，以及默认审计策略。

## 关键对象

- `ResourceType`：例如 `invoice`、`api_key`。
- `ResourceAction`：例如 `read`、`approve`、`delete`。
- `ResourceMapping`：资源类型到 Core 内部 `resources` 表的映射。
- `Resource`：具体资源实例，包含 Space、Group、Owner 和 metadata。

## 接入顺序

1. 注册 resource type。
2. 注册 actions。
3. 创建业务资源对应的 Plystra resource。
4. 给角色授予 permission。
5. 在业务 API 执行前调用 `authz/check`。
