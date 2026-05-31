---
title: 实现地图
description: 当前 Plystra 已实现 surface、仓库边界、成熟度标签和用法入口。
---

本页映射当前 workspace 已经实现的内容，并区分 stable 行为、preview surface 和长期 Backend OS vision。

## 稳定性标签

| 标签 | 含义 |
|---|---|
| Stable | 当前自托管 Core release line 已实现、可依赖的行为。 |
| Preview | 已实现但仍属于 metadata、feature-flagged 或 alpha 的行为，后续可能调整。 |
| Vision | 来自 `product-spec.en.md` 和 phase PRDs 的产品方向，不是当前 runtime 承诺。 |

## 仓库边界

| 仓库 | 状态 | 负责内容 |
|---|---|---|
| `plystra/plystra` | Stable Core 加 preview extension metadata | HTTP API、minimal native auth、actor context、API keys、authorization engine、Resource Registry、AuditLog、migrations、system capabilities、template scaffold CLI、生成的 OpenAPI。 |
| `plystra/plystra-docs` | Stable docs site | 中英文文档、OpenAPI 下载、生产与运维指南。 |
| `plystra/js-sdk` | Stable SDK surface | TypeScript/JavaScript client，覆盖稳定 Core HTTP surface。 |
| `plystra/python-sdk` | Stable SDK surface | Python sync/async client，覆盖稳定 Core HTTP surface。 |
| `plystra/go-plystra` | Stable SDK surface | Go client，覆盖稳定 Core HTTP surface。 |
| `plystra/plugin-auth-complete` | 独立插件 | 公开注册、密码登录、refresh/logout、email verification code、magic link、插件自有 auth settings 和 challenge state。 |
| `plystra/email-contracts` | 独立 domain contract | `email.transactional` capability contract 和 `POST /contract/v1/email/send` 请求校验。 |
| `plystra/plugin-email-smtp` | 独立 provider plugin | SMTP 版 `email.transactional`；非敏感 SMTP 设置在数据库，凭据在 secrets/env。 |
| `plystra/plugin-email-cloudflare` | 独立 provider plugin | Cloudflare Email Sending Worker 版 `email.transactional`；bearer token 在 Cloudflare secrets。 |
| `plystra/capability-contracts` | 独立 protocol contract | 通用 `/contract/v1/capability/*` protocol、capability profile 校验、process-backed capability helpers。产品/domain contracts 位于独立 repo。 |

## 当前 Stable Core

| 能力 | Runtime surface | 文档 |
|---|---|---|
| Minimal native auth | `/api/v1/auth/register`、`/login`、`/refresh`、`/logout`；注册默认关闭 | [HTTP API](/zh/guides/http-api/)、[Admin Auth 与安全边界](/zh/reference/admin-auth-and-security/) |
| Actor context | `/api/v1/actor/context`、`/api/v1/actor/switch-member` | [身份与作用域](/zh/concepts/identity-and-scope/) |
| Admin grants | `/api/v1/admin/*`，支持 instance、Space、Group scopes | [Admin Auth 与安全边界](/zh/reference/admin-auth-and-security/) |
| API keys | `/api/v1/api-keys`、scoped server-to-server auth、HMAC 存储 | [API Key 与 AdminGrant](/zh/guides/developer-handbook/api-keys-and-admin-grants/) |
| Authorization engine | `/api/v1/authz/check`、`/api/v1/authz/explain` | [授权模型](/zh/guides/developer-handbook/authorization-model/) |
| Context Mode | 可信 API key 调用 inline actor/resource/grants | [接入你的应用](/zh/guides/integrate-your-app/) |
| Resource Registry | resource types、actions、mappings、resources | [Resource Registry](/zh/reference/resource-registry/) |
| Audit trace | append-only 授权与 mutation audit logs | [审计 Trace](/zh/reference/audit-trace/) |
| System capabilities | `audit.explainable`、`identity.business`、`resource.registry`、`authorization.resource`、`admin.control_plane` | [System Capabilities](/zh/reference/system-capabilities/) |
| Migrations and schema | PostgreSQL、Ent schema、versioned Atlas-style migrations | [数据库与迁移](/zh/reference/database-and-migrations/) |
| Production guardrails | production startup validation、secret rotation、CORS、timeouts | [配置项](/zh/reference/configuration/)、[自托管部署](/zh/guides/self-hosting/) |
| OpenAPI | 生成的 JSON/YAML 下载 | [OpenAPI](/zh/reference/openapi/) |
| SDKs | JS、Python、Go clients，覆盖稳定 Core HTTP surface | [SDK](/zh/guides/sdks/) |

## 当前 Preview And Alpha Surfaces

| Surface | 当前行为 | 边界 |
|---|---|---|
| Plugin metadata API | Core 内实现 manifest validation、metadata install、lifecycle flags、settings、resources、permissions、audit events、admin menus | 不是稳定 hot-loaded plugin runtime 或 marketplace。 |
| Capability declarations | Plugin manifest 可声明 provides/requires capabilities；templates 可要求 capabilities | certification/conformance 未完成。Domain contracts 应来自真实插件。 |
| Template metadata API | 列出内置 template manifests，支持 preview/install metadata records | 可审计 Backend OS Alpha scaffold 使用 `plystractl templates create`。 |
| Backend OS Alpha scaffolds | `blank`、`internal-admin`、`community-lite`、`auth-ready-saas` 生成可检查应用目录 | cloud hosting 和 marketplace 不在范围内。 |
| Data Console | `/api/v1/data/*` feature-flagged routes，用于 internal-table mapped resources | 默认关闭，不是稳定生产 data platform。 |
| Complete Auth plugin | 独立完整认证插件 | 独立 repo；Core 仍保持最小认证面。邮件发送需要 email contracts 加 provider plugin。 |
| Email providers | SMTP 和 Cloudflare 实现 `email.transactional` | 独立 repo、独立部署服务。 |

## Vision Only

这些属于产品方向，不是当前生产保证：

- cloud hosting。
- public plugin marketplace。
- third-party plugin sandboxing。
- 完整 action gateway runtime。
- 完整 capability certification program。
- hosted billing、CMS、storage 等宽业务 capability families。

Plystra 当前可靠的产品承诺是：先用自托管、可解释的授权和审计 Core 保护一个现有后端动作；需要时再逐步增长到 governed resources、plugins、capabilities 和 templates。
