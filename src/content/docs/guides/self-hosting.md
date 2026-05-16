---
title: Self-hosting
description: Run the Plystra Kernel with PostgreSQL, versioned migrations, readiness checks, and production safety settings.
---

Phase 1 self-hosting runs the `kernel` service with an external PostgreSQL database.

```text
reverse proxy / load balancer
    -> plystra-kernel
        -> PostgreSQL
```

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` / `PLYSTRA_DATABASE_URL` | PostgreSQL connection string. |
| `PLYSTRA_API_KEY` / `KERNEL_API_KEY` | Scoped server API key accepted by Kernel. |
| `PLYSTRA_API_KEY_PERMISSIONS` | Optional comma-separated permission list. |
| `SERVER_HOST` | Bind host, default `127.0.0.1`. |
| `SERVER_PORT` | Bind port, default `8080`. |
| `SERVER_ADDR` | Optional full bind address override. |
| `CORS_ALLOWED_ORIGINS` | Optional comma-separated browser origins. |

Default API key permissions include `authz:check`, `authz:explain`, `audit:read`, `capabilities:read`, `resource_registry:read`, and `resource_registry:manage`.

## Migrations

```powershell
cd kernel
$env:DATABASE_URL = "postgres://plystra:plystra@localhost:5432/plystra?sslmode=disable"
go run .\cmd\plystrad migrate
go run .\cmd\plystrad migrate status
```

Kernel runtime database access is Ent-backed. Production schema changes are represented by versioned Atlas-style SQL files under `kernel/migrations/` and recorded in `atlas_schema_revisions`.

## Start

```powershell
$env:DATABASE_URL = "postgres://plystra:plystra@localhost:5432/plystra?sslmode=disable"
$env:PLYSTRA_API_KEY = "ply_kernel_secret"
go run .\cmd\plystrad serve
```

Kernel exposes:

```text
GET /api/v1/health
GET /api/v1/ready
GET /api/v1/version
```

The readiness endpoint checks database connectivity and required system capability registration.

## Smoke Test

```bash
curl -s http://localhost:8080/api/v1/health
curl -s http://localhost:8080/api/v1/ready
curl -s -H "X-Plystra-API-Key: $PLYSTRA_API_KEY" http://localhost:8080/api/v1/capabilities
```

Then run an allow and a deny Context Mode check and verify audit logs:

```bash
curl -s -H "X-Plystra-API-Key: $PLYSTRA_API_KEY" http://localhost:8080/api/v1/audit/logs
```

## Backup

Back up PostgreSQL before upgrades:

```bash
pg_dump "$DATABASE_URL" > plystra-kernel-backup.sql
```

Verify restores in staging before relying on a backup policy.
