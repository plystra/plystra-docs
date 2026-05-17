---
title: Configuration
description: Environment variables supported by the current Plystra Core runtime.
---

Plystra Core is configured through environment variables. In production, `cmd/plystrad` validates safety-critical settings before opening the database.

## Server

| Variable | Default | Description |
|---|---|---|
| `SERVER_HOST` / `PLYSTRA_SERVER_HOST` | empty | Optional bind host. Empty binds all interfaces. |
| `SERVER_PORT` / `PLYSTRA_SERVER_PORT` | `8080` | HTTP port. |
| `SERVER_MODE` / `PLYSTRA_ENV` | `development` | Set to `production` for production guards. |
| `SERVER_PUBLIC_URL` / `PLYSTRA_SERVER_PUBLIC_URL` | local development URL in `.env.example` | Public URL. Required and non-localhost in production. |
| `PLYSTRA_CORE_VERSION` / `CORE_VERSION` | `1.0.0-rc121` | Reported by the version endpoint. |

## Database

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | development PostgreSQL URL | Primary database URL. |
| `PLYSTRA_DATABASE_URL` | none | Compatibility alias used by tests and tools. |
| `DOCKER_DATABASE_URL` | Compose PostgreSQL URL | Used by `docker-compose.yml` for the Core container. |

Production rejects the default `plystra:plystra` credentials.

## Security

| Variable | Default | Description |
|---|---|---|
| `PLYSTRA_SESSION_SECRET` | development placeholder | Secret for HMAC hashing stored opaque bearer tokens. |
| `PLYSTRA_SESSION_SECRET_PREVIOUS` | empty | Optional comma-separated previous secrets accepted during session secret rotation. New tokens are always hashed with the primary secret. |
| `PLYSTRA_API_KEY_SECRET` | development placeholder | Secret for HMAC hashing stored API keys. Required before API keys can be created and must be distinct from the session secret in production. |
| `PLYSTRA_API_KEY_SECRET_PREVIOUS` | empty | Optional comma-separated previous API key secrets accepted during API key secret rotation. |
| `HTTP_READ_HEADER_TIMEOUT` | `5s` | HTTP server read-header timeout. |
| `HTTP_READ_TIMEOUT` | `30s` | HTTP server request read timeout. |
| `HTTP_WRITE_TIMEOUT` | `60s` | HTTP server response write timeout. |
| `HTTP_IDLE_TIMEOUT` | `120s` | HTTP keep-alive idle timeout. |
| `TRUSTED_PROXIES` | empty | Enables trusted forwarded IP parsing for known proxies. |
| `PLYSTRA_PASSWORD_MIN_LENGTH` | `12` | Minimum password length for native auth user creation and password updates. |
| `PLYSTRA_AUTH_LOGIN_MAX_FAILURES` | `8` | Failed login attempts allowed within the login failure window before temporary lockout. |
| `PLYSTRA_AUTH_LOGIN_WINDOW` | `15m` | Login failure counting window. Duration strings are accepted. |
| `PLYSTRA_AUTH_LOGIN_LOCKOUT` | `15m` | Temporary lockout duration after too many failed login attempts. |
| `PLYSTRA_AUTH_REGISTRATION_ENABLED` | `false` | Enables ordinary user registration after at least one active `instance_super_admin` exists. |
| `PLYSTRA_AUTH_REGISTRATION_TOKEN` | empty | Shared registration token required for ordinary registration. Required and at least 32 characters in production when registration is enabled. |
| `PLYSTRA_AUTH_PUBLIC_USER_REGISTRATION_ENABLED` | `false` | Enables public user-only registration without a registration token. This creates only a User; it does not create a personal Space, Member, UserMember binding, Space admin grant, or session. |
| `PLYSTRA_BOOTSTRAP_REGISTRATION_ENABLED` | `false` | Enables the protected first-super-admin registration path only while no active `instance_super_admin` exists. |
| `PLYSTRA_BOOTSTRAP_REGISTRATION_TOKEN` | empty | Separate bootstrap registration token. Required and at least 32 characters in production when bootstrap registration is enabled. |

Do not use the placeholder values from `.env.example` in production.

Native auth stores and verifies passwords with Argon2id. Refresh calls rotate both the access token and refresh token. Password changes revoke existing sessions for that User. API keys are stored as HMAC hashes, are shown only once at creation, and should be kept in a secret manager.

Registration is disabled by default. Keep it disabled for enterprise deployments unless an explicit onboarding flow needs it. First-super-admin registration uses a separate bootstrap flag and token so ordinary registration cannot silently create the initial instance owner. Public user-only registration is intentionally narrower than ordinary registration and should be followed by an explicit onboarding or admin-controlled Member binding flow.

## CORS and Request Metadata

| Variable | Default | Description |
|---|---|---|
| `CORS_ALLOWED_ORIGINS` | localhost list | Comma-separated allowed origins. Production rejects empty or wildcard values. |
| `REQUEST_ID_HEADER` | `X-Request-ID` | Request ID header name. |

HTTP authorization checks do not accept body-provided `ip`, `user_agent`, or canonical `request_id`. The server derives those values from the request and middleware.

## Audit and Trace

| Variable | Default | Description |
|---|---|---|
| `AUDIT_WRITE_MODE` | `always` | Store write mode for authz audit decisions. |
| `TRACE_VERSION` | `1.0` | Trace version for decision snapshots. |

AuditLog is append-only. Production deployments should define retention and export policies.

## Feature Flags

| Variable | Default | Description |
|---|---|---|
| `DATA_CONSOLE_ENABLED` | `false` | Enables `/api/v1/data/*` preview routes when explicitly set. |
| `METRICS_ENABLED` | `false` | Enables `/metrics` when explicitly set. |
| `METRICS_TOKEN` / `PLYSTRA_METRICS_TOKEN` | empty | Token for `/metrics`. If omitted, a Bearer session with `metrics:read` is accepted when metrics are enabled. |

Disabled feature routes return `FEATURE_DISABLED`.

## Production Guard Summary

With `SERVER_MODE=production`, Core refuses to start if:

- database URL is missing or uses default development credentials.
- session secret is missing, too short, or a placeholder.
- previous session secret rotation values are too short or placeholders.
- API key secret must be set to a strong distinct value in production before creating production API keys.
- ordinary or bootstrap registration is enabled without its matching strong registration token. Public user-only registration does not require a token because it does not create actor bindings or admin grants.
- CORS origins are missing or include `*`.
- public URL is missing or points to localhost.
