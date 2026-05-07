---
title: Self-hosting
description: Run Plystra Core with Docker Compose, PostgreSQL, migrations, readiness checks, and production safety settings.
---

Plystra v1.0 is designed to be self-hosted with PostgreSQL. The recommended production pattern is:

```text
reverse proxy / load balancer
    -> plystra-core
        -> PostgreSQL
```

Use the provided `Dockerfile`, `docker-compose.yml`, migrations, and `plystractl` checks as the baseline.

## Compose Baseline

```bash
cp .env.example .env
docker compose up -d
```

Important Compose variables:

| Variable | Default | Purpose |
|---|---|---|
| `SERVER_PORT` | `8080` | Host port for Core. |
| `DOCKER_DATABASE_URL` | Compose PostgreSQL URL | Database URL used by the container. |
| `CORS_ALLOWED_ORIGINS` | `*` in Compose fallback | Development-friendly fallback. Production mode rejects wildcard CORS. |
| `PLYSTRA_ADMIN_TOKEN` | development placeholder | Bootstrap token for protected routes. |
| `DATA_CONSOLE_ENABLED` | `false` | Keeps preview data routes disabled. |
| `METRICS_ENABLED` | `false` | Keeps `/metrics` disabled. |

For local development, `.env.example` uses explicit localhost CORS values.

## Migration Procedure

Always apply migrations before relying on the server:

```bash
go run ./cmd/plystractl migrate up
go run ./cmd/plystractl migrate verify
go run ./cmd/plystractl ent check
go run ./cmd/plystractl doctor
```

Production upgrades must use versioned migrations. Do not use Ent auto migration as the production upgrade mechanism.

## Start Core

```bash
go run ./cmd/plystrad
```

or with Compose:

```bash
docker compose up -d plystra-core
```

Core exposes:

```text
GET /api/v1/health
GET /api/v1/ready
GET /api/v1/version
```

The readiness endpoint checks database connectivity and expected migration/schema state.

## Production Required Settings

When `SERVER_MODE=production`, startup validates:

| Setting | Production rule |
|---|---|
| `DATABASE_URL` or `PLYSTRA_DATABASE_URL` | Required; must not use default `plystra:plystra` credentials. |
| `PLYSTRA_SESSION_SECRET`, `SESSION_SECRET`, `JWT_SECRET`, or `PLYSTRA_JWT_SECRET` | At least 32 characters and not a default placeholder. |
| `PLYSTRA_ADMIN_TOKEN` or `ADMIN_TOKEN` | At least 32 characters and not a default placeholder. |
| `CORS_ALLOWED_ORIGINS` | Required; must not include `*`. |
| `SERVER_PUBLIC_URL` or `PLYSTRA_SERVER_PUBLIC_URL` | Required; must not point to localhost. |

`JWT_SECRET` is a compatibility alias. The current runtime uses opaque bearer tokens, stores HMAC token hashes, and does not issue JWT claims.

## Reverse Proxy and Client IPs

Plystra only trusts forwarded IP headers when `TRUSTED_PROXIES` is configured. Otherwise request IP metadata comes from `RemoteAddr`.

Use this only for reverse proxies you operate:

```text
TRUSTED_PROXIES=127.0.0.1,10.0.0.0/8
```

## Audit Settings

Keep production audit mode enabled:

```text
AUDIT_WRITE_MODE=always
TRACE_VERSION=1.0
```

Authorization decisions and Core management mutations write audit traces. AuditLog is append-only and should be included in backup and retention planning.

## Backup and Upgrade Checklist

Before upgrading:

1. Read release notes.
2. Run `plystractl doctor`.
3. Back up PostgreSQL.
4. Stop or quiesce write traffic if needed.
5. Apply migrations.
6. Run `migrate verify`, `ent check`, and `doctor`.
7. Smoke test health, ready, version, `authz/check`, `authz/explain`, Resource Registry, and AuditLog query.

Minimum backup:

```bash
pg_dump "$DATABASE_URL" > plystra-backup.sql
```

Store backups outside the server and verify restore on staging for production deployments.
