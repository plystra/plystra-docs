---
title: 开发者手册
description: 面向生产接入的 Plystra Core v1.0 开发者入口页。
---

这份手册已经拆成多个短页面。你的应用如果已经有发票、工单、订单、文档、案件、项目等业务对象，并且要把“谁可以对哪个对象做什么”交给 Plystra Core 判断，就从这里开始。

示例按照当前 `1.0.0-rc104` 的真实 Core API 和 SDK 行为编写。完整接入建议按顺序阅读，也可以直接跳到正在实现的部分。

## 推荐阅读顺序

1. [模型与生产架构](/zh/guides/developer-handbook/model-and-architecture/) 说明 Core 存什么，以及 Plystra 在生产系统中的位置。
2. [本地启动与超级管理员 Bootstrap](/zh/guides/developer-handbook/local-bootstrap/) 帮你启动 Core，并创建第一个 `instance_super_admin`。
3. [授权模型](/zh/guides/developer-handbook/authorization-model/) 解释 authz 请求契约、决策语义、deny code 和 scope 行为。
4. [可复制接入流程](/zh/guides/developer-handbook/integration-path/) 用具体 HTTP 调用完成一套 `invoice.approve` 配置。
5. [API Key 与 AdminGrant](/zh/guides/developer-handbook/api-keys-and-admin-grants/) 说明机器凭证和人类控制面权限。
6. [SDK 接入与错误处理](/zh/guides/developer-handbook/sdk-and-errors/) 展示 JavaScript、Python、Go SDK 的生产用法。
7. [生产检查清单与排错](/zh/guides/developer-handbook/production-checklist/) 列出最后检查项和常见失败原因。

## 你会完成什么

读完后，你会拥有：

- 一个已注册的 resource type 和 action
- 一个带 Group 的 Space
- 一个 User、Member、UserMember 绑定
- 一个带安全 scope anchor 的 Role 和 Permission 授权
- 一个受保护资源
- 一个会返回可解释 allow/deny 的 `authz.check` 调用
- 一套使用用户 session 或 scoped API key 的生产凭证策略

## 凭证选择原则

用户驱动的 Core 管理操作使用 Bearer access token。服务到服务授权检查和自动化任务使用 scoped API key。不要把 API key 放进浏览器或移动端。

## 继续阅读

- [快速开始](/zh/getting-started/)
- [接入你的应用](/zh/guides/integrate-your-app/)
- [SDK](/zh/guides/sdks/)
- [Admin Auth 与安全边界](/zh/reference/admin-auth-and-security/)
- [Core API 参考](/zh/reference/core-api/)
