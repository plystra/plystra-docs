---
title: 配置项
description: 当前 Plystra Core runtime 支持的环境变量。
---

Plystra Core 通过环境变量配置。生产环境中，`cmd/plystrad` 会在打开数据库前验证安全关键配置。

## Server

| 变量 | 默认值 | 说明 |
|---|---|---|
| `SERVER_HOST` / `PLYSTRA_SERVER_HOST` | 空 | 可选 bind host。为空时绑定所有 interfaces。 |
| `SERVER_PORT` / `PLYSTRA_SERVER_PORT` | `8080` | HTTP 端口。 |
| `SERVER_MODE` / `PLYSTRA_ENV` | `development` | 设为 `production` 启用生产 guard。 |
| `SERVER_PUBLIC_URL` / `PLYSTRA_SERVER_PUBLIC_URL` | `.env.example` 中的本地开发 URL | Public URL。生产必填且不能是 localhost。 |
| `PLYSTRA_CORE_VERSION` / `CORE_VERSION` | `1.0.0-rc121` | version endpoint 返回的 Core 版本。 |

## Database

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DATABASE_URL` | 开发 PostgreSQL URL | 主数据库 URL。 |
| `PLYSTRA_DATABASE_URL` | 无 | tests 和 tools 使用的兼容 alias。 |
| `DOCKER_DATABASE_URL` | Compose PostgreSQL URL | `docker-compose.yml` 中 Core 容器使用。 |

生产模式拒绝默认 `plystra:plystra` 凭据。

## Security

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PLYSTRA_SESSION_SECRET` | 开发 placeholder | 用于 HMAC hashing opaque bearer tokens 的 secret。 |
| `PLYSTRA_SESSION_SECRET_PREVIOUS` | 空 | session secret 轮换期间可接受的旧 secret，逗号分隔。新 token 始终使用主 secret hash。 |
| `PLYSTRA_API_KEY_SECRET` | 开发 placeholder | 用于 HMAC hashing API key 的 secret。创建 API key 前必须设置；生产环境必须与 session secret 不同。 |
| `PLYSTRA_API_KEY_SECRET_PREVIOUS` | 空 | API key secret 轮换期间可接受的旧 secret，逗号分隔。 |
| `HTTP_READ_HEADER_TIMEOUT` | `5s` | HTTP server read-header timeout。 |
| `HTTP_READ_TIMEOUT` | `30s` | HTTP server request read timeout。 |
| `HTTP_WRITE_TIMEOUT` | `60s` | HTTP server response write timeout。 |
| `HTTP_IDLE_TIMEOUT` | `120s` | HTTP keep-alive idle timeout。 |
| `TRUSTED_PROXIES` | 空 | 为已知代理启用可信 forwarded IP 解析。 |
| `PLYSTRA_PASSWORD_MIN_LENGTH` | `12` | Native auth 创建用户和更新密码时的最小密码长度。 |
| `PLYSTRA_AUTH_LOGIN_MAX_FAILURES` | `8` | 登录失败窗口内允许的失败次数，超过后临时锁定。 |
| `PLYSTRA_AUTH_LOGIN_WINDOW` | `15m` | 登录失败统计窗口，支持 duration 字符串。 |
| `PLYSTRA_AUTH_LOGIN_LOCKOUT` | `15m` | 登录失败过多后的临时锁定时长。 |
| `PLYSTRA_AUTH_REGISTRATION_ENABLED` | `false` | 启用普通用户注册。系统必须已经存在至少一个 active `instance_super_admin`。 |
| `PLYSTRA_AUTH_REGISTRATION_TOKEN` | 空 | 普通注册 token。生产环境启用注册时必须设置，且至少 32 字符。 |
| `PLYSTRA_AUTH_PUBLIC_USER_REGISTRATION_ENABLED` | `false` | 启用无需 registration token 的公开 user-only 注册。该模式只创建 User，不创建 Member、UserMember binding、Space admin grant 或 session。 |
| `PLYSTRA_BOOTSTRAP_REGISTRATION_ENABLED` | `false` | 在还没有 active `instance_super_admin` 时，启用受保护的首个 super admin 注册路径。 |
| `PLYSTRA_BOOTSTRAP_REGISTRATION_TOKEN` | 空 | 独立 bootstrap 注册 token。生产环境启用 bootstrap 注册时必须设置，且至少 32 字符。 |

生产环境不要使用 `.env.example` 中的 placeholder 值。

Native auth 使用 Argon2id 存储和验证密码。Refresh 会同时轮换 access token 和 refresh token。密码变更会撤销该 User 的现有 sessions。API key 只保存 HMAC hash，明文只在创建时返回一次，应放入 secret manager。

Core 不内置 email verification code 或 magic-link sign-in。这些流程位于独立 Complete Auth plugin repo。启用后，该插件保存自己的短生命周期一次性 challenge，在 magic-link 消费后写入 Core-compatible session，并通过独立 email contracts repo 加 email provider plugin 发送邮件。

## Complete Auth Plugin 配置

Complete Auth plugin 只从环境变量读取 secrets 和进程启动值。非敏感、经常变化的运行时设置保存在插件数据库表 `plugin_auth_settings`。

环境变量：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `AUTH_PLUGIN_LISTEN_ADDR` | `127.0.0.1:8790` | Complete Auth plugin HTTP bind 地址。 |
| `DATABASE_URL` / `PLYSTRA_DATABASE_URL` | Core database URL | 与 Core 相同的 PostgreSQL 数据库。 |
| `PLYSTRA_SESSION_SECRET` | 空 | 与 Core 相同的 session secret，用于创建 Core-compatible session。生产必填。 |
| `PLYSTRA_SESSION_SECRET_PREVIOUS` | 空 | secret 轮换期间接受的旧 session secrets。 |
| `PLYSTRA_EMAIL_CAPABILITY_TOKEN` / `EMAIL_CAPABILITY_TOKEN` | 空 | 调用配置的 email capability endpoint 时发送的 Bearer secret。DB 设置 `email_delivery_mode` 为 `capability` 时必填。 |

`plugin_auth_settings` 数据库设置：

| 设置 | 默认值 | 说明 |
|---|---|---|
| `public_registration_enabled` | `false` | 启用 Complete Auth 的匿名公开注册。 |
| `email_delivery_mode` | `"log"` | 开发使用 `log`，生产邮件发送使用 `capability`。 |
| `email_capability_url` | `""` | 实现 `POST /contract/v1/email/send` 的 HTTPS endpoint。 |
| `email_capability_timeout` | `"10s"` | 调用 capability endpoint 的 HTTP timeout。 |
| `email_from_address` | `""` | 已验证 sender email address；capability mode 必填。 |
| `email_from_name` | `"Plystra"` | Sender display name。 |
| `public_app_url` | `""` | fallback magic link 的公开应用 base URL。 |
| `server_public_url` | `""` | fallback magic link 的公开服务 URL。 |
| `magic_link_path` | `"/auth/consume"` | fallback magic-link consume path。 |
| `allowed_redirect_origins` | `[]` | 额外允许的 HTTPS redirect origins。 |
| `email_code_ttl` | `"10m"` | Verification code 有效期。 |
| `magic_link_ttl` | `"10m"` | Magic-link 有效期。 |
| `auth_challenge_max_attempts` | `5` | 单个持久化 challenge 的最大验证尝试次数。 |
| `email_send_max_attempts` | `3` | rate-limit window 内最大 challenge 发送次数。 |
| `login_failure_limit` | `8` | lockout 前允许的登录失败次数。 |
| `login_failure_window` | `"15m"` | 登录失败统计窗口。 |
| `login_failure_lockout` | `"15m"` | 临时 lockout 时长。 |
| `max_request_body_bytes` | `1048576` | JSON request body 最大字节数。 |
| `trusted_proxy_cidrs` | `[]` | 允许提供 forwarded client IP headers 的反向代理。 |

Complete Auth 公开注册会在 `space_default` 中创建普通 active User 以及 default Member/UserMember binding。它不会创建 instance super-admin grant 或公开 admin 权限。企业部署除非有明确 onboarding 流程，否则应保持公开注册关闭。

## CORS 与请求元数据

| 变量 | 默认值 | 说明 |
|---|---|---|
| `CORS_ALLOWED_ORIGINS` | localhost 列表 | 逗号分隔的允许 origins。生产拒绝空值或 wildcard。 |
| `REQUEST_ID_HEADER` | `X-Request-ID` | Request ID header 名称。 |

HTTP authorization checks 不接受 body 中的 `ip`、`user_agent` 和 canonical `request_id`，这些值以服务端和 middleware 派生值为准。

## Audit 与 Trace

| 变量 | 默认值 | 说明 |
|---|---|---|
| `AUDIT_WRITE_MODE` | `always` | Authz audit decision 的写入模式。 |
| `TRACE_VERSION` | `1.0` | Decision snapshot 的 trace version。 |

AuditLog 是 append-only。生产部署应定义 retention 和 export 策略。

## Feature Flags

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DATA_CONSOLE_ENABLED` | `false` | 显式启用 `/api/v1/data/*` preview routes。 |
| `METRICS_ENABLED` | `false` | 显式启用 `/metrics`。 |
| `METRICS_TOKEN` / `PLYSTRA_METRICS_TOKEN` | 空 | `/metrics` token。启用 metrics 但为空时接受拥有 `metrics:read` 的 Bearer session。 |

被关闭的 feature routes 返回 `FEATURE_DISABLED`。

## 生产 guard 摘要

`SERVER_MODE=production` 时，Core 会在以下情况拒绝启动：

- database URL 缺失或使用默认开发凭据。
- session secret 缺失、过短或为 placeholder。
- previous session secret 轮换值过短或为 placeholder。
- 生产环境必须配置独立强 `PLYSTRA_API_KEY_SECRET` 后再创建生产 API key。
- 普通注册或 bootstrap 注册开启，但没有配置对应的强注册 token。公开 user-only 注册不要求 token，因为它不会创建 actor binding 或 admin grant。
- CORS origins 缺失或包含 `*`。
- public URL 缺失或指向 localhost。
