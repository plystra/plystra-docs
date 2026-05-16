---
title: Self-hosting
description: Run Plystra with PostgreSQL, trusted system capability sidecars, migrations, readiness checks, and production safety settings.
---

Plystra v1.0 targets PostgreSQL self-hosting. The recommended production shape is:

```text
reverse proxy / load balancer
    -> plystrad from plystra/plystra
        -> PostgreSQL
        -> local trusted system capability sidecars
```

Use the repository `Dockerfile`, `docker-compose.yml`, migrations, `scripts/build-capabilities.ps1`, and `plystractl` checks as the baseline.

## Compose Baseline

```bash
cp .env.example .env
docker compose up -d
```

Important Compose variables:

| Variable | Default | Purpose |
|---|---|---|
| `SERVER_PORT` | `8080` | Public Core port. |
| `DOCKER_DATABASE_URL` | Compose PostgreSQL URL | Database URL inside containers. |
| `CORS_ALLOWED_ORIGINS` | localhost list | Explicit browser origins. Production mode rejects wildcard CORS. |
| `PLYSTRA_SESSION_SECRET` | development placeholder | Secret for HMAC opaque session tokens. |
| `PLYSTRA_API_KEY_SECRET` | development placeholder | Secret for HMAC API keys. Production requires an independent strong secret. |
| `PLYSTRA_SYSTEM_CAPABILITIES_CONFIG` | empty | Optional explicit path to `system-capabilities.yaml`. |
| `PLYSTRA_LOCKFILE` | empty | Optional explicit path to the capability lockfile. |
| `HTTP_READ_HEADER_TIMEOUT` | `5s` | Slow header read protection. |
| `HTTP_READ_TIMEOUT` | `30s` | Request read timeout. |
| `HTTP_WRITE_TIMEOUT` | `60s` | Response write timeout. |
| `HTTP_IDLE_TIMEOUT` | `120s` | Keep-alive idle timeout. |
| `DATA_CONSOLE_ENABLED` | `false` | Preview data routes are disabled by default. |
| `METRICS_ENABLED` | `false` | `/metrics` is disabled by default. |

The local development `.env.example` uses explicit localhost CORS values.

## System Capabilities

Build the official sidecar artifacts before starting a deployment that should run externalized system capabilities:

```powershell
cd C:\Users\i\Documents\GitHub\plystra\plystra
.\scripts\build-capabilities.ps1
```

The script builds:

- `audit.explainable`
- `identity.business`
- `resource.registry`
- `authorization.resource`
- `admin.control_plane`

It copies each manifest and migration bundle into `capabilities/`, builds local binaries, and removes the old lockfile. On next boot, `plystrad` creates `capabilities/plystra.lock` with pinned versions and binary checksums.

System capabilities are trusted startup-time modules. Do not use this mechanism for third-party runtime installs, hot unload, marketplace replacement of authz/audit/identity, or Go ABI plugins.

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

Runtime database access is Ent-backed. Production schema changes are represented by versioned Atlas-style SQL files under `plystra/migrations/` and recorded in `schema_migrations`. System capability migration bundles are validated and applied by `plystrad` in dependency order and recorded in `kernel_capability_migrations`.

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

The local demo migration already creates this grant for Alice. For non-demo databases, after migrations and before exposing the service, run:

```bash
go run ./cmd/plystractl admin bootstrap-super-admin --user-id <existing_user_id>
```

If an active instance super admin already exists, the command refuses to run. After bootstrap, sign in as that user and use `/api/v1/admin/grants` to create additional administrators.

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
