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
| `PLYSTRA_CORE_VERSION` / `CORE_VERSION` | `1.0.0-dev10` | version endpoint 返回的 Core 版本。 |

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
| `PLYSTRA_SESSION_SECRET` / `SESSION_SECRET` | 开发 placeholder | HMAC hashing opaque bearer tokens 的推荐 secret。 |
| `PLYSTRA_SESSION_SECRET_PREVIOUS` / `SESSION_SECRET_PREVIOUS` | 空 | session secret 轮换期间可接受的旧 secret，逗号分隔。新 token 始终使用主 secret hash。 |
| `JWT_SECRET` / `PLYSTRA_JWT_SECRET` | 兼容 placeholder | session secret 的兼容 alias。Core v1.0 不签发 JWT claims。 |
| `PLYSTRA_API_KEY_SECRET` / `API_KEY_SECRET` | 非生产环境 fallback 到 session secret | HMAC hashing API key 的 secret。生产环境必须使用独立强 secret。 |
| `PLYSTRA_API_KEY_SECRET_PREVIOUS` / `API_KEY_SECRET_PREVIOUS` | 空 | API key secret 轮换期间可接受的旧 secret，逗号分隔。 |
| `HTTP_READ_HEADER_TIMEOUT` | `5s` | HTTP server read-header timeout。 |
| `HTTP_READ_TIMEOUT` | `30s` | HTTP server request read timeout。 |
| `HTTP_WRITE_TIMEOUT` | `60s` | HTTP server response write timeout。 |
| `HTTP_IDLE_TIMEOUT` | `120s` | HTTP keep-alive idle timeout。 |
| `TRUSTED_PROXIES` | 空 | 为已知代理启用可信 forwarded IP 解析。 |
| `PLYSTRA_PASSWORD_MIN_LENGTH` | `12` | Native auth 创建用户和更新密码时的最小密码长度。 |
| `PLYSTRA_AUTH_LOGIN_MAX_FAILURES` | `8` | 登录失败窗口内允许的失败次数，超过后临时锁定。 |
| `PLYSTRA_AUTH_LOGIN_WINDOW` | `15m` | 登录失败统计窗口，支持 duration 字符串。 |
| `PLYSTRA_AUTH_LOGIN_LOCKOUT` | `15m` | 登录失败过多后的临时锁定时长。 |

生产环境不要使用 `.env.example` 中的 placeholder 值。

Native auth 的新密码使用 Argon2id 存储。旧 PBKDF2 hash 仍可登录，并会在成功登录后升级。Refresh 会同时轮换 access token 和 refresh token。密码变更会撤销该 User 的现有 sessions。API key 只保存 HMAC hash，明文只在创建时返回一次，应放入 secret manager。

## CORS 与请求元数据

| 变量 | 默认值 | 说明 |
|---|---|---|
| `CORS_ALLOWED_ORIGINS` | localhost 列表 | 逗号分隔的允许 origins。生产拒绝空值或 wildcard。 |
| `REQUEST_ID_HEADER` | `X-Request-ID` | Request ID header 名称。 |

HTTP authorization checks 会忽略 body 中的 `ip`、`user_agent` 和 canonical `request_id`，以服务端和 middleware 派生值为准。

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
- CORS origins 缺失或包含 `*`。
- public URL 缺失或指向 localhost。
