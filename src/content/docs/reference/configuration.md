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
| `PLYSTRA_CORE_VERSION` / `CORE_VERSION` | `1.0.0-dev` | Reported by the version endpoint. |

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
| `PLYSTRA_SESSION_SECRET` / `SESSION_SECRET` | development placeholder | Preferred secret for HMAC hashing stored opaque bearer tokens. |
| `PLYSTRA_SESSION_SECRET_PREVIOUS` / `SESSION_SECRET_PREVIOUS` | empty | Optional comma-separated previous secrets accepted during session secret rotation. New tokens are always hashed with the primary secret. |
| `JWT_SECRET` / `PLYSTRA_JWT_SECRET` | compatibility placeholder | Compatibility alias for the session secret. Core v1.0 does not issue JWT claims. |
| `PLYSTRA_API_KEY_SECRET` / `API_KEY_SECRET` | session secret fallback outside production | Secret for HMAC hashing stored API keys. Production mode requires a distinct strong value. |
| `PLYSTRA_API_KEY_SECRET_PREVIOUS` / `API_KEY_SECRET_PREVIOUS` | empty | Optional comma-separated previous API key secrets accepted during API key secret rotation. |
| `TRUSTED_PROXIES` | empty | Enables trusted forwarded IP parsing for known proxies. |
| `PLYSTRA_PASSWORD_MIN_LENGTH` | `12` | Minimum password length for native auth user creation and password updates. |
| `PLYSTRA_AUTH_LOGIN_MAX_FAILURES` | `8` | Failed login attempts allowed within the login failure window before temporary lockout. |
| `PLYSTRA_AUTH_LOGIN_WINDOW` | `15m` | Login failure counting window. Duration strings are accepted. |
| `PLYSTRA_AUTH_LOGIN_LOCKOUT` | `15m` | Temporary lockout duration after too many failed login attempts. |

Do not use the placeholder values from `.env.example` in production.

Native auth stores new passwords with Argon2id. Legacy PBKDF2 hashes remain readable and are upgraded after a successful login. Refresh calls rotate both the access token and refresh token. Password changes revoke existing sessions for that User. API keys are stored as HMAC hashes, are shown only once at creation, and should be kept in a secret manager.

## CORS and Request Metadata

| Variable | Default | Description |
|---|---|---|
| `CORS_ALLOWED_ORIGINS` | localhost list in `.env.example`, `*` Compose fallback | Comma-separated allowed origins. Production rejects empty or wildcard values. |
| `REQUEST_ID_HEADER` | `X-Request-ID` | Request ID header name. |

HTTP authorization checks ignore body-provided `ip`, `user_agent`, and canonical `request_id`. The server derives those values from the request and middleware.

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
- CORS origins are missing or include `*`.
- public URL is missing or points to localhost.
