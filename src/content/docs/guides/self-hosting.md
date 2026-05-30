---
title: Self-hosting
description: Run Plystra with PostgreSQL, built-in trusted system capabilities, migrations, readiness checks, and production safety settings.
---

Plystra v1.0 targets PostgreSQL self-hosting. The recommended production shape is:

```text
reverse proxy / load balancer
    -> plystrad from plystra/plystra
        -> PostgreSQL
        -> built-in trusted system capabilities
```

Use the repository `Dockerfile`, `docker-compose.yml`, migrations, and `plystractl` checks as the baseline.

## Compose Baseline

```bash
cp .env.example .env
docker compose up -d --build postgres
docker compose run --rm plystra-core plystractl migrate up
docker compose run --rm plystra-core plystractl migrate verify
docker compose up -d plystra-core
```

Compose does not auto-run migrations. Apply and verify migrations explicitly before starting Core or before rolling out a new image.

Important Compose variables:

| Variable | Default | Purpose |
|---|---|---|
| `SERVER_PORT` | `8080` | Public Core port. |
| `DOCKER_DATABASE_URL` | Compose PostgreSQL URL | Database URL inside containers. |
| `CORS_ALLOWED_ORIGINS` | localhost list | Explicit browser origins. Production mode rejects wildcard CORS. |
| `PLYSTRA_SESSION_SECRET` | development placeholder | Secret for HMAC opaque session tokens. |
| `PLYSTRA_API_KEY_SECRET` | development placeholder | Secret for HMAC API keys. Production requires an independent strong secret. |
| `HTTP_READ_HEADER_TIMEOUT` | `5s` | Slow header read protection. |
| `HTTP_READ_TIMEOUT` | `30s` | Request read timeout. |
| `HTTP_WRITE_TIMEOUT` | `60s` | Response write timeout. |
| `HTTP_IDLE_TIMEOUT` | `120s` | Keep-alive idle timeout. |
| `PLYSTRA_AUTH_REGISTRATION_ENABLED` | `false` | Enables token-protected ordinary Core registration after an instance super admin exists. |
| `PLYSTRA_AUTH_REGISTRATION_TOKEN` | empty | Shared token for ordinary Core registration. Use a strong 32+ character value when enabled. |
| `PLYSTRA_BOOTSTRAP_REGISTRATION_ENABLED` | `false` | Enables the protected first-super-admin registration path only while no instance super admin exists. |
| `PLYSTRA_BOOTSTRAP_REGISTRATION_TOKEN` | empty | Separate strong token for first-super-admin registration bootstrap. |
| `PLYSTRA_AUTH_PUBLIC_USER_REGISTRATION_ENABLED` | `false` | Enables narrow public user-only Core registration. It creates only a User. |
| `DATA_CONSOLE_ENABLED` | `false` | Preview data routes are disabled by default. |
| `METRICS_ENABLED` | `false` | `/metrics` is disabled by default. |

The local development `.env.example` uses explicit localhost CORS values.

## System Capabilities

The official system capabilities are compiled into the `plystrad` binary and loaded by the kernel during startup:

- `audit.explainable`
- `identity.business`
- `resource.registry`
- `authorization.resource`
- `admin.control_plane`

They register services, routes, migration ownership metadata, and lifecycle health through `internal/kernel/contracts`. Do not use this mechanism for third-party runtime installs, hot unload, marketplace replacement of authz/audit/identity, sidecar loading, or Go ABI plugins.

## Migration Flow

Apply migrations before exposing trusted APIs:

```bash
go run entgo.io/ent/cmd/ent generate ./ent/schema
go run ./cmd/plystractl migrate up
go run ./cmd/plystractl migrate verify
go run ./cmd/plystractl ent check
go run ./cmd/plystractl doctor
```

Production upgrades must use versioned migrations. Do not use Ent auto migration as the production upgrade mechanism.

Runtime database access is Ent-backed. Production schema changes are represented by versioned Atlas-style SQL files under `plystra/migrations/` and recorded in `schema_migrations`. System capability migration ownership is registered through the kernel, but release migrations are still applied through the same Atlas-style migration flow.

## Start Core

```bash
go run ./cmd/plystrad
```

Or use Compose:

```bash
docker compose up -d plystra-core
```

Core exposes:

```text
GET /api/v1/health
GET /api/v1/ready
GET /api/v1/version
```

The readiness endpoint checks database connectivity, expected migration/schema state, and required system capability readiness.

## Required Production Configuration

When `SERVER_MODE=production`, startup validates:

| Config | Production rule |
|---|---|
| `DATABASE_URL` or `PLYSTRA_DATABASE_URL` | Required; must not use default `plystra:plystra` credentials. |
| `PLYSTRA_SESSION_SECRET` | At least 32 characters and not the default placeholder. |
| `PLYSTRA_API_KEY_SECRET` | At least 32 characters, not the default placeholder, and distinct from the session secret. |
| `CORS_ALLOWED_ORIGINS` | Required; must not include `*`. |
| `SERVER_PUBLIC_URL` or `PLYSTRA_SERVER_PUBLIC_URL` | Required; must not point to localhost. |

The current runtime uses opaque bearer tokens, stores HMAC token hashes, and does not issue JWT claims.

## First Instance Super Admin

Core management APIs use the same User/session model as business authorization. The first administrator is an `AdminGrant`:

```text
level = instance_super_admin
permission_key = *
```

Migrations never create this grant automatically. After migrations and before exposing the service, run:

```bash
go run ./cmd/plystractl admin bootstrap-super-admin --user-id <existing_user_id>
```

If an active instance super admin already exists, the command refuses to run. After bootstrap, sign in as that user and use `/api/v1/admin/grants` to create additional administrators.

## Complete Auth Plugin

Core intentionally keeps the auth surface small: protected registration, password login, refresh/logout, and actor context. Public registration, email verification codes, magic links, and email-provider integration live in the independent Complete Auth plugin repository.

Build the plugin from the parent workspace so the independent `email-contracts` repository is available to Go module replacement:

```bash
cd plystra
docker build -f plugin-auth-complete/Dockerfile -t plystra-auth-complete .
```

Apply the Complete Auth plugin SQL migrations to the same PostgreSQL database before starting the plugin. The plugin stores its non-sensitive runtime settings in `plugin_auth_settings`, including public registration, delivery mode, capability URL, sender address, redirect allowlist, TTLs, rate limits, max body size, and trusted proxy CIDRs. Secrets remain environment variables or secret-manager values.

Production email delivery requires:

```text
email_delivery_mode = "capability"
email_capability_url = "https://..."
email_from_address = "no-reply@example.com"
```

The capability URL must implement the independent email delivery contract. Official provider plugin repositories include SMTP and Cloudflare Email Sending.

## Backend OS Alpha Templates

For an inspectable one-command setup scaffold, generate an application directory from an official template:

```bash
go run ./cmd/plystractl templates create --template auth-ready-saas --name "Acme SaaS" --out ./acme-saas
```

The generated directory contains a `docker-compose.yml`, `.env.example`, template manifest, install explanation, and README. It does not write real secrets, does not run migrations automatically, and does not create the first instance super admin. Review the generated files, set production secrets, then follow the generated README.

## Reverse Proxy and Client IP

Plystra trusts forwarded IP headers only when `TRUSTED_PROXIES` is configured. Otherwise request IP metadata comes from `RemoteAddr`.

Configure it only for reverse proxies you control:

```text
TRUSTED_PROXIES=127.0.0.1,10.0.0.0/8
```

## Audit Configuration

Recommended production defaults:

```text
AUDIT_WRITE_MODE=always
TRACE_VERSION=1.0
```

Authorization decisions and Core management mutations write audit traces. AuditLog is append-only and must be included in backup and retention policy.

## Backup and Upgrade Checklist

Before upgrading:

1. Read release notes.
2. Run `plystractl doctor`.
3. Back up PostgreSQL.
4. Stop or quiet write traffic when needed.
5. Apply migrations.
6. Run `migrate verify`, `ent check`, and `doctor`.
7. Smoke test health, ready, version, `authz/check`, `authz/explain`, Resource Registry, AuditLog queries, and `/api/v1/capabilities`.

Minimum backup command:

```bash
pg_dump "$DATABASE_URL" > plystra-backup.sql
```

Production deployments should store backups outside the server and verify restores in staging.
