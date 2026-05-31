---
title: Complete Auth Plugin
description: 独立完整认证插件边界、路由、数据库配置、email capability 集成和生产规则。
---

Complete Auth 是独立插件仓库，不属于 Plystra Core。

Core 有意只保留最小认证面：受保护注册、密码登录、refresh/logout 和 actor context。应用需要 hosted-auth 风格能力时使用 Complete Auth，例如公开注册、email verification code 和 magic-link sign-in。

## 仓库

```text
plystra/plugin-auth-complete
```

插件使用与 Core 相同的 PostgreSQL 数据库，拥有自己的 plugin tables，并在成功登录或 magic-link 消费后签发 Core-compatible session。公开注册不会创建 instance super-admin 权限。

## 路由

| Method | Path | 用途 |
|---|---|---|
| `POST` | `/api/v1/auth/register` | `plugin_auth_settings` 启用后允许公开注册。 |
| `POST` | `/api/v1/auth/login` | 密码登录。 |
| `POST` | `/api/v1/auth/refresh` | 刷新 session tokens。 |
| `POST` | `/api/v1/auth/logout` | 撤销 sessions。 |
| `POST` | `/api/v1/auth/email-code` | 创建并发送短生命周期 email verification-code challenge。 |
| `POST` | `/api/v1/auth/email-code/verify` | 校验 6 位 code 并消费 challenge。 |
| `POST` | `/api/v1/auth/magic-link` | 创建并发送短生命周期 magic-link challenge。 |
| `POST` | `/api/v1/auth/magic-link/consume` | 消费 magic-link token 并创建 Core-compatible session。 |
| `GET` | `/health` | Plugin health check。 |

## 数据库设置

只有 secrets 和进程启动值来自环境变量。非敏感、经常变化的运行时设置存入 `plugin_auth_settings`。

| 设置 | 默认值 | 生产建议 |
|---|---|---|
| `public_registration_enabled` | `false` | 除非应用有明确 onboarding 策略，否则保持关闭。 |
| `email_delivery_mode` | `log` | 生产使用 `capability`。 |
| `email_capability_url` | empty | 实现 `POST /contract/v1/email/send` 的 HTTPS endpoint。 |
| `email_capability_timeout` | `10s` | 保持短且明确。 |
| `email_from_address` | empty | capability mode 必填；必须是已验证 sender。 |
| `email_from_name` | `Plystra` | 非敏感 sender display name。 |
| `public_app_url` | empty | 构造 fallback magic-link URL。 |
| `server_public_url` | empty | 构造 fallback server URL。 |
| `magic_link_path` | `/auth/consume` | 应用 consume path。 |
| `allowed_redirect_origins` | `[]` | 额外 HTTPS redirect origins。 |
| `email_code_ttl` | `10m` | Verification-code challenge TTL。 |
| `magic_link_ttl` | `10m` | Magic-link challenge TTL。 |
| `auth_challenge_max_attempts` | `5` | 每个 challenge 最大验证尝试次数。 |
| `email_send_max_attempts` | `3` | rate-limit window 内 challenge 发送尝试次数。 |
| `login_failure_limit` | `8` | lockout 前允许的登录失败次数。 |
| `login_failure_window` | `15m` | 登录失败统计窗口。 |
| `login_failure_lockout` | `15m` | lockout 时长。 |
| `max_request_body_bytes` | `1048576` | JSON request body limit。 |
| `trusted_proxy_cidrs` | `[]` | 允许提供 forwarded client IP headers 的反向代理。 |

不要把 session secret、email capability bearer token、SMTP password 或 provider API credentials 存到该表。

## 环境 Secrets

| 变量 | 何时必需 | 用途 |
|---|---|---|
| `DATABASE_URL` / `PLYSTRA_DATABASE_URL` | 始终 | 与 Core 相同的 PostgreSQL database。 |
| `PLYSTRA_SESSION_SECRET` | 始终 | 与 Core 相同的 secret，用于兼容 Core session。 |
| `PLYSTRA_SESSION_SECRET_PREVIOUS` | secret rotation | 轮换期间接受旧 session tokens。 |
| `PLYSTRA_EMAIL_CAPABILITY_TOKEN` / `EMAIL_CAPABILITY_TOKEN` | `email_delivery_mode=capability` | 发给 email capability provider 的 Bearer token。 |
| `AUTH_PLUGIN_LISTEN_ADDR` | 可选 | HTTP bind address。 |

## Email Capability 依赖

Complete Auth 只有在启用 email delivery 时拉取独立 email contract：

```text
plystra/email-contracts
capability id: email.transactional
version: 0.0.1
level: standard
endpoint: POST /contract/v1/email/send
```

官方 provider implementations：

| Provider repo | Runtime | Mutable settings |
|---|---|---|
| `plystra/plugin-email-smtp` | Node/Nodemailer HTTP service | 非敏感 SMTP transport settings 在 `plugin_email_smtp_settings`；凭据在 secrets/env。 |
| `plystra/plugin-email-cloudflare` | Cloudflare Worker | Cloudflare `send_email` binding 和 `EMAIL_CAPABILITY_TOKEN` secret；sender 来自 contract request。 |

## 安全规则

- Public registration 默认关闭。
- Public registration 只创建普通 active User 和 `space_default` 中的 Simple Mode 默认 binding；不会创建 instance super-admin grant。
- Codes 和 magic-link tokens 一次性使用，且只保存 HMAC hash。
- 发送和验证尝试都会限流。
- 生产必须使用 `email_delivery_mode=capability` 和 HTTPS capability URL。
- Magic-link redirect URL 必须使用 HTTPS，并匹配 `public_app_url`、`server_public_url` 或 `allowed_redirect_origins`。
- Provider credentials 必须留在 source-controlled config 和非敏感 settings tables 之外。

## Docker

从父级 Plystra workspace 构建，这样 local `email-contracts` module replacement 可用：

```bash
cd plystra
docker build -f plugin-auth-complete/Dockerfile -t plystra-auth-complete .
```

启动插件前先应用 plugin SQL migrations。插件服务应在 Core/PostgreSQL ready 后运行，并暴露 `/health` 给编排系统。
