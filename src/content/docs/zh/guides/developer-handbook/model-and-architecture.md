---
title: 模型与生产架构
description: 接入前先理解 Plystra 对象模型和推荐生产架构。
---

## Plystra 负责什么

Plystra Core 回答你的后端一个问题：

```text
这个 User，是否可以通过这个 Space 内的这个 Member，对这个资源执行这个 action？
```

Plystra 不是你的业务数据库，也不是完整 SaaS 平台。它是身份与授权控制面，负责存储：

| 概念 | Plystra 中的对象 | 作用 |
|---|---|---|
| `User` | 登录账号和审计主体。 | 记录真实是谁发起了操作。 |
| `Space` | 租户、工作区、组织、环境或账号边界。 | 防止跨租户越权。 |
| `Member` | Space 内的业务身份。 | 多个 User 可以通过同一个 Member 行动，一个 User 也可以绑定多个 Member。 |
| `UserMember` | User 到 Member 的绑定。 | 被撤销、过期或 inactive 时，即使 Role 匹配也会 deny。 |
| `Group` | Space 内的层级作用域。 | 用于 `finance` 覆盖 `finance.apac` 这类 group tree 授权。 |
| `Permission` | resource、action、scope 规则。 | 例如 `invoice.approve` + `group_tree`。 |
| `Role` | Space 内的权限集合。 | 通过 `MemberRole` 授给 Member。 |
| `MemberRole` | Member 的 Role 授权，可带 Group anchor。 | 定义 Role 在哪里生效。 |
| `ResourceType` 和 `ResourceMapping` | Resource Registry。 | 告诉引擎资源如何暴露 `space_id`、`group_id`、owner、status。 |
| `Resource` | Core 内置的资源镜像表。 | 让外部业务对象能以稳定 id 被授权检查。 |
| `AdminGrant` | 人类管理员能力。 | 用同一套 User/session 体系保护 Core 管理 API。 |
| `ApiKey` | 机器凭证，带显式权限和 scope。 | 用于服务到服务调用。 |
| `AuditLog` | 追加式决策和 mutation trace。 | 事后解释 allow/deny。 |

## 推荐生产架构

默认使用下面的架构：

```text
浏览器或客户端
  -> 你的前端或网关完成用户认证
  -> 你的后端拿到自己的应用 session
  -> 你的后端调用 Plystra：
       用户驱动的管理操作使用 user access token
       服务到服务的授权检查使用 scoped API key
  -> 只有 Plystra 返回 allow 时，你的后端才执行真正业务动作
```

不要把 API key 放进浏览器或移动端。API key 是服务端机器密钥。

不要信任浏览器直接传来的 actor tuple。应该由可信后端根据自己的 session 或 Plystra access token 解析 `User`、`Member`、`UserMember` 和 `Space`。
