---
title: 可解释身份核心
description: User、UserMember、Member、Space 如何构成 Plystra 的身份链路。
---

Plystra 的核心建模不是“账号直接拥有权限”，而是把登录账号和业务身份分开。

```text
User -> UserMember -> Member -> Space
```

## 对象含义

- `User`：可以登录的账号。
- `Member`：在某个 Space 内行动的业务身份。
- `UserMember`：User 与 Member 的绑定，可登录、委托、过期或撤销。
- `Space`：租户、组织或业务工作区边界。

## 为什么这样设计

同一个人可以通过多个业务身份行动；多个账号也可以共享一个业务身份。审计记录必须能解释“谁登录了系统”和“他使用哪个业务身份行动”，否则授权和审计会混在一起。

## v1.0 要求

- UserMember 必须是显式实体。
- revoked / expired UserMember 不能通过授权。
- 授权必须校验 same-space。
- 审计 trace 必须保存决策时的身份链路快照。
- 业务实体数据库访问使用 Ent；`schema_migrations` 属于迁移控制面。
- 生产升级使用 Atlas-backed `plystractl migrate up` 和 `migrations/atlas.sum` 校验。
- 非公开 API 使用用户体系的 admin grant 或 scoped API key 保护，不使用 admin-token。
- Data Console 和 metrics 默认关闭。
