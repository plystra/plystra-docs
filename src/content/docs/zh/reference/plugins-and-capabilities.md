---
title: Plugins and Capabilities
description: 当前 plugin metadata API、独立 capability contracts、provider plugin 拆分和 Backend OS alpha 边界。
---

Plystra 使用 plugins 和 capabilities 从 Core 向外扩展，但当前实现是分阶段的。

## 当前边界

| 区域 | 当前状态 |
|---|---|
| Plugin metadata API | Core 中已实现 preview routes。 |
| Plugin runtime | 不是稳定 hot-loaded runtime。官方 sidecar/plugin repos 独立运行。 |
| Capability declarations | Plugin manifests 和 templates 中已实现。 |
| Generic capability protocol | 独立 `capability-contracts` repo。 |
| Domain capability contracts | 独立 repo，例如 `email-contracts`。 |
| Marketplace/cloud install | Vision，不是当前 runtime 行为。 |

Core 永远不会把 authorization、audit、identity、resource registry 或 admin control 当成普通可选插件。它们是内置 system capabilities。

## Core Plugin Metadata Routes

| Method | Path |
|---|---|
| `POST` | `/api/v1/plugins/validate-manifest` |
| `POST` | `/api/v1/plugins/install` |
| `GET` | `/api/v1/plugins` |
| `GET` | `/api/v1/plugins/{plugin_key}` |
| `POST` | `/api/v1/plugins/{plugin_key}/enable` |
| `POST` | `/api/v1/plugins/{plugin_key}/disable` |
| `POST` | `/api/v1/plugins/{plugin_key}/uninstall` |
| `GET`, `PATCH` | `/api/v1/plugins/{plugin_key}/settings` |
| `GET` | `/api/v1/plugins/{plugin_key}/resources` |
| `GET` | `/api/v1/plugins/{plugin_key}/permissions` |
| `GET` | `/api/v1/plugins/{plugin_key}/audit-events` |
| `GET` | `/api/v1/plugins/{plugin_key}/admin-menus` |

这些路由负责验证和保存 metadata，暴露生成的 resource/permission/audit/admin-menu views，并切换 lifecycle status。它们不会把任意第三方代码加载进 Core。

## Manifest Shape

当前 manifest 校验：

- reverse-DNS style plugin id，例如 `plystra.moderation`。
- semantic version-like plugin version。
- `manifest_version` 和 `plugin_api_version`，Core v1.0 均为 `1.0`。
- `requires_core` version constraint。
- resource/action definitions。
- permissions 使用合法 scopes，且不能声明 `global` scope grants。
- audit event keys。
- admin menu paths 必须位于 `/plugins/` 下。
- provided capability profiles。
- required capability profiles。

Capability IDs 使用 dotted names，例如 `email.transactional`。合法 capability levels 是 `experimental`、`standard` 和 `enterprise`。

## 独立 Contract Repos

| 仓库 | 负责内容 | 说明 |
|---|---|---|
| `capability-contracts` | 通用 capability protocol、profile/requirement validation、checksum helpers、`capserver` helper | Domain-neutral。 |
| `email-contracts` | `email.transactional` contract 和 request validation | Domain-specific。Implementations 暴露 `POST /contract/v1/email/send`。 |

不要把 domain contracts 放入 generic contracts repo。Domain contracts 应该从真实 plugin/provider 行为中提取。

## Email Provider 拆分

Complete Auth 生产环境不直接发送邮件。它需要实现 `email.transactional` 的 provider：

```text
Complete Auth plugin
  -> email-contracts: POST /contract/v1/email/send
      -> SMTP provider plugin
      -> Cloudflare Email Sending provider plugin
```

| Provider | Repo | Production secret handling |
|---|---|---|
| SMTP | `plugin-email-smtp` | `EMAIL_CAPABILITY_TOKEN`、`SMTP_USERNAME` 和 `SMTP_PASSWORD` 是 secrets。非敏感 SMTP host/port/TLS defaults 存在 `plugin_email_smtp_settings`。 |
| Cloudflare Email Sending | `plugin-email-cloudflare` | `EMAIL_CAPABILITY_TOKEN` 是 Cloudflare secret；Cloudflare binding config 在 Worker config；sender 由 contract request 提供。 |

两个 provider 都会拒绝 header injection、client-controlled transport headers、过多 recipients 和超大 message body。

## Official Metadata Seed

Core migrations 会 seed API keys、webhooks、notifications 和 moderation 的官方 plugin metadata。该 metadata 用来展示插件如何声明 resources、permissions、audit events、admin menus 和 settings。它不表示这些插件会作为任意代码加载进 Core。

## Template Capability Requirements

Templates 可以要求 plugins 和 capabilities。例如：

| Template | Required plugin | Required capability |
|---|---|---|
| `internal-admin` | `plystra.api_keys`、`plystra.webhooks` | `api_key.credential` standard |
| `community-lite` | `plystra.moderation` | none |
| `auth-ready-saas` | `plystra.auth_complete` | `email.transactional` standard |

Capability resolution 已足够支持 templates 和 metadata previews。Certified capability conformance 仍属于未来工作。
