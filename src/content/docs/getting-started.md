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
go run entgo.io/ent/cmd/ent generate ./ent/schema
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

If this demo output looks correct, the fastest next step is the [Developer Handbook](/guides/developer-handbook/). It splits this same model into setup, authorization, copy-paste API calls, SDK examples, credential choices, admin grant rules, and production boundary tests. The shorter [Integrate Your App](/guides/integrate-your-app/) guide is also available when you only need the business endpoint flow.

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

## Use Protected API Routes

All non-public Core API routes require a Bearer access token for a user with an active admin grant.

Local demo data already grants Alice `instance_super_admin` with `permission_key="*"`. Login and export her access token:

```bash
export PLYSTRA_ACCESS_TOKEN=$(
  curl -s -X POST http://localhost:8080/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"alice@example.com","password":"plystra-demo"}' |
  jq -r '.data.access_token'
)
```

Then call protected routes:

```bash
curl -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" \
  http://localhost:8080/api/v1/audit/logs
```

For a non-demo database, create the first instance super admin with `plystractl`. This command only works when no active `instance_super_admin` grant exists:

```bash
go run ./cmd/plystractl admin bootstrap-super-admin --user-id <existing_user_id>
```

After the first super admin exists, use `/api/v1/admin/grants` to appoint instance admins, Space admins, and Group admins.

For an end-to-end production integration, use the [Developer Handbook](/guides/developer-handbook/) instead of assembling the individual endpoint calls from scratch.

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
PLYSTRA_SESSION_SECRET
PLYSTRA_API_KEY_SECRET
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
