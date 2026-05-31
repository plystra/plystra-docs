---
title: Complete Auth Plugin
description: Independent full-auth plugin boundary, routes, database-backed settings, email capability integration, and production rules.
---

Complete Auth is an independent plugin repository. It is not part of Plystra Core.

Core intentionally keeps only minimal authentication: protected registration, password login, refresh/logout, and actor context. Use Complete Auth when an application needs hosted-auth-style flows such as public registration, email verification codes, and magic-link sign-in.

## Repository

```text
plystra/plugin-auth-complete
```

The plugin uses the same PostgreSQL database as Core, owns its plugin tables, and mints Core-compatible sessions after successful login or magic-link consumption. It does not create instance super-admin privileges through public registration.

## Routes

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Public registration when enabled in `plugin_auth_settings`. |
| `POST` | `/api/v1/auth/login` | Password login. |
| `POST` | `/api/v1/auth/refresh` | Refresh session tokens. |
| `POST` | `/api/v1/auth/logout` | Revoke sessions. |
| `POST` | `/api/v1/auth/email-code` | Create and send a short-lived email verification-code challenge. |
| `POST` | `/api/v1/auth/email-code/verify` | Verify a six-digit code and consume the challenge. |
| `POST` | `/api/v1/auth/magic-link` | Create and send a short-lived magic-link challenge. |
| `POST` | `/api/v1/auth/magic-link/consume` | Consume a magic-link token and create a Core-compatible session. |
| `GET` | `/health` | Plugin health check. |

## Database Settings

Only secrets and process bootstrap values come from environment variables. Non-sensitive, frequently changed runtime settings are stored in `plugin_auth_settings`.

| Setting | Default | Production guidance |
|---|---|---|
| `public_registration_enabled` | `false` | Keep disabled unless the application has a defined onboarding policy. |
| `email_delivery_mode` | `log` | Use `capability` in production. |
| `email_capability_url` | empty | HTTPS endpoint implementing `POST /contract/v1/email/send`. |
| `email_capability_timeout` | `10s` | Keep short and explicit. |
| `email_from_address` | empty | Required in capability mode; must be a verified sender. |
| `email_from_name` | `Plystra` | Non-sensitive sender display name. |
| `public_app_url` | empty | Used to build fallback magic-link URLs. |
| `server_public_url` | empty | Used to build fallback server URLs. |
| `magic_link_path` | `/auth/consume` | Application consume path. |
| `allowed_redirect_origins` | `[]` | Additional HTTPS redirect origins. |
| `email_code_ttl` | `10m` | Verification-code challenge TTL. |
| `magic_link_ttl` | `10m` | Magic-link challenge TTL. |
| `auth_challenge_max_attempts` | `5` | Maximum verification attempts per challenge. |
| `email_send_max_attempts` | `3` | Challenge send attempts per rate-limit window. |
| `login_failure_limit` | `8` | Failed login attempts before lockout. |
| `login_failure_window` | `15m` | Login failure counting window. |
| `login_failure_lockout` | `15m` | Lockout duration. |
| `max_request_body_bytes` | `1048576` | JSON request body limit. |
| `trusted_proxy_cidrs` | `[]` | Reverse proxies allowed to provide forwarded client IP headers. |

Do not store session secrets, email capability bearer tokens, SMTP passwords, or provider API credentials in this table.

## Environment Secrets

| Variable | Required when | Purpose |
|---|---|---|
| `DATABASE_URL` / `PLYSTRA_DATABASE_URL` | Always | Same PostgreSQL database used by Core. |
| `PLYSTRA_SESSION_SECRET` | Always | Same secret as Core so sessions are compatible. |
| `PLYSTRA_SESSION_SECRET_PREVIOUS` | Secret rotation | Accept old session tokens during rotation. |
| `PLYSTRA_EMAIL_CAPABILITY_TOKEN` / `EMAIL_CAPABILITY_TOKEN` | `email_delivery_mode=capability` | Bearer token sent to the email capability provider. |
| `AUTH_PLUGIN_LISTEN_ADDR` | Optional | HTTP bind address. |

## Email Capability Dependency

Complete Auth pulls in the independent email contract only when email delivery is enabled:

```text
plystra/email-contracts
capability id: email.transactional
version: 1.0.0
level: standard
endpoint: POST /contract/v1/email/send
```

Official provider implementations:

| Provider repo | Runtime | Mutable settings |
|---|---|---|
| `plystra/plugin-email-smtp` | Node/Nodemailer HTTP service | Non-sensitive SMTP transport settings in `plugin_email_smtp_settings`; credentials in secrets/env. |
| `plystra/plugin-email-cloudflare` | Cloudflare Worker | Cloudflare `send_email` binding and `EMAIL_CAPABILITY_TOKEN` secret; sender comes from the contract request. |

## Security Rules

- Public registration is disabled by default.
- Public registration creates normal active Users and default Simple Mode bindings in `space_default`; it does not create instance super-admin grants.
- Codes and magic-link tokens are single-use and stored only as HMAC hashes.
- Send and verification attempts are rate-limited.
- Production must use `email_delivery_mode=capability` with an HTTPS capability URL.
- Magic-link redirect URLs must be HTTPS and match `public_app_url`, `server_public_url`, or `allowed_redirect_origins`.
- Provider credentials remain outside source-controlled config and outside non-sensitive settings tables.

## Docker

Build from the parent Plystra workspace so the local `email-contracts` module replacement is available:

```bash
cd plystra
docker build -f plugin-auth-complete/Dockerfile -t plystra-auth-complete .
```

Apply plugin SQL migrations before starting the plugin. The plugin service should run after Core/PostgreSQL are ready and should expose `/health` for orchestration.
