---
title: v1.0 就绪状态
description: Plystra Core v1.0 当前发布就绪面。
---

v1.0 的目标是稳定、自托管、可解释的 Core，而不是完整 SaaS 平台。

## 必须具备

- 可解释身份链路。
- Ent 管理业务数据库实体。
- Resource Registry。
- authz check/explain。
- 追加式 audit log。
- Bearer user session 保护非公开 API。
- Docker Compose 本地运行。
- migration verify、Ent check、doctor、Go tests 通过。

## 不属于 v1.0 默认开放

- Data Console 默认关闭。
- Metrics 默认关闭。
- `global` scope 保留但禁用。
