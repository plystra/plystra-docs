---
title: Quickstart
description: Install Plystra Core locally, apply migrations, run checks, and call the current v1.0 API safely.
---

Plystra Core v1.0 is a self-hosted identity and authorization service. It separates login accounts from the business identity that acts inside a Space:

```text
User -> UserMember -> Member -> Space
```

The current Core repository includes the HTTP API server, PostgreSQL migrations, Ent schemas, the authorization engine, the Finance Reviewer demo, OpenAPI artifacts, and release readiness checks.

## Prerequisites

- Go, using the version supported by the Core repository.
- Docker and Docker Compose.
- PostgreSQL through the included Compose baseline, or a compatible PostgreSQL database.
- `rg` is useful for maintainers but is not required to run Core.

## Install

```bash
git clone https://github.com/plystra/plystra.git
cd plystra
cp .env.example .env
docker compose up -d
```

The Compose baseline starts PostgreSQL and `plystra-core`. Core reads `.env`, uses `DOCKER_DATABASE_URL` inside Compose, and exposes the API on `SERVER_PORT`, which defaults to `8080`.

## Apply and Verify the Schema

Run migrations before relying on any API behavior:

```bash
go run ./cmd/plystractl migrate up
go run ./cmd/plystractl migrate verify
go run ./cmd/plystractl ent check
go run ./cmd/plystractl doctor
```

Expected healthy output includes:

```text
migrations verified
ent schema is in sync
environment: development
configuration: ok
database: ok
migrations: current
schema: ok
service readiness: ok
```

`doctor` warns when development secrets still use defaults. In production those same conditions become startup blockers.

## Run the Demo

```bash
go run ./cmd/explain-demo
```

The demo prints four required traces:

| Case | Decision | What it proves |
|---|---|---|
| Alice approves Finance APAC invoice | `allow` | `group_tree` covers a descendant group. |
| Alice approves Legal EMEA invoice | `deny: SCOPE_OUT_OF_BOUNDS` | Group boundaries are enforced. |
| Bob approves through the same Member | `allow` | Multiple Users can act through the same Member identity. |
| Alice uses a revoked binding | `deny: USER_MEMBER_REVOKED` | `UserMember` is the active authorization bridge. |

## Start the API

```bash
go run ./cmd/plystrad
```

Public operational endpoints:

```bash
curl http://localhost:8080/api/v1/health
curl http://localhost:8080/api/v1/ready
curl http://localhost:8080/api/v1/version
```

Legacy operational aliases also exist under `/system/*` and `/api/v1/system/*`.

## Use Protected API Routes

All non-public Core API routes require the bootstrap admin token:

```bash
curl -H "X-Plystra-Admin-Token: $PLYSTRA_ADMIN_TOKEN" \
  http://localhost:8080/api/v1/audit-logs
```

The same token can also be passed as `Authorization: Bearer <token>` for admin-token protected routes. Session endpoints use a separate opaque bearer-token flow.

## Login Flow

The seeded local demo users are:

```text
alice@example.com / plystra-demo
bob@example.com / plystra-demo
```

Login returns an opaque access token, refresh token, active actor context, and available member bindings:

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"plystra-demo"}'
```

Use the access token for actor context:

```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  http://localhost:8080/api/v1/actor/context
```

## Production Baseline

Before setting `SERVER_MODE=production`, configure:

```text
DATABASE_URL
PLYSTRA_SESSION_SECRET or JWT_SECRET
PLYSTRA_ADMIN_TOKEN
CORS_ALLOWED_ORIGINS
SERVER_PUBLIC_URL
```

Production mode rejects default database credentials, short or default secrets, wildcard CORS origins, and localhost public URLs.

## What Is Disabled by Default

The current v1.0 release keeps risky preview surfaces closed unless explicitly enabled:

```text
DATA_CONSOLE_ENABLED=false
METRICS_ENABLED=false
```

When disabled, those routes return `FEATURE_DISABLED`.
