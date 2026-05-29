---
title: Getting Started
description: Run Plystra locally, test native auth, and protect one action with Context Mode.
---

Plystra starts with the `plystra/plystra` runtime. You can test native auth and protect one existing backend action without migrating all users, organizations, roles, or business resources into Plystra.

## Prerequisites

- Docker Desktop or Go plus PostgreSQL 16+
- A strong session secret and API key secret outside local development
- A server-side API key for Context Mode calls

## Start With Docker

```bash
cd plystra/plystra
docker compose up -d --build postgres
docker compose run --rm plystra-core plystractl migrate up
docker compose run --rm plystra-core plystractl migrate verify
docker compose up -d plystra-core
```

Core exposes:

```bash
curl -s http://localhost:8080/api/v1/health
curl -s http://localhost:8080/api/v1/ready
curl -s http://localhost:8080/api/v1/version
```

For the local demo only, explicitly bootstrap Alice as the instance super admin:

```bash
docker compose run --rm plystra-core plystractl admin bootstrap-super-admin \
  --user-id user_alice \
  --member-id member_finance_reviewer \
  --grant-id ag_alice_local_demo_instance_super_admin \
  --if-exists ok
```

Migrations never create a production super admin automatically.

## Start From Source

Linux and macOS:

```bash
cd ~/src/plystra/plystra
export DATABASE_URL="postgres://plystra:plystra@localhost:5432/plystra?sslmode=disable"
go run ./cmd/plystractl migrate up
go run ./cmd/plystractl migrate verify
go run ./cmd/plystrad
```

Windows PowerShell:

```powershell
cd C:\Users\i\Documents\GitHub\plystra\plystra
$env:DATABASE_URL = "postgres://plystra:plystra@localhost:5432/plystra?sslmode=disable"
go run .\cmd\plystractl migrate up
go run .\cmd\plystractl migrate verify
go run .\cmd\plystrad
```

Plystra exposes public health, readiness, and version routes:

```bash
curl -s http://localhost:8080/api/v1/health
curl -s http://localhost:8080/api/v1/ready
curl -s http://localhost:8080/api/v1/version
```

Protected server-to-server routes require `X-Plystra-API-Key`. User/admin routes use the Bearer session flow.

## Native Auth Smoke Test

Log in as the local demo user after explicit bootstrap:

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"plystra-demo"}'
```

The response includes `access_token`, `refresh_token`, `actor`, and `available_members`.

Registration is disabled by default. Token-protected ordinary registration can be enabled for test/dev by setting:

```text
PLYSTRA_AUTH_REGISTRATION_ENABLED=true
PLYSTRA_AUTH_REGISTRATION_TOKEN=<32+ character token>
```

Ordinary registration creates a User, default Member, default UserMember, session, and a Space admin grant in the single Simple Mode default Space `space_default`. It does not create an instance super admin.

## Create an API Key

Create a server-side API key from an admin session:

```bash
curl -s -X POST http://localhost:8080/api/v1/api-keys \
  -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "invoice-service-dev",
    "level": "instance",
    "permission_keys": ["authz:check"]
  }'
```

Store the returned `api_key` securely. It is shown once.

## Protect One Action

Context Mode lets your existing backend pass trusted actor, resource, and grant context inline.

```bash
curl -s -X POST http://localhost:8080/api/v1/authz/check \
  -H "Content-Type: application/json" \
  -H "X-Plystra-API-Key: $PLYSTRA_API_KEY" \
  -d '{
    "actor": {
      "user_id": "user_external_alice",
      "member_id": "member_finance_reviewer",
      "binding_id": "binding_external_alice_finance",
      "space_id": "space_acme"
    },
    "resource": {
      "type": "invoice",
      "external_id": "invoice_001",
      "space_id": "space_acme",
      "group_path": "finance.apac",
      "owner_member_id": "member_invoice_creator"
    },
    "grants": [{
      "role_key": "finance_approver",
      "resource": "invoice",
      "action": "approve",
      "scope": "group_tree",
      "space_id": "space_acme",
      "scope_anchor_group_path": "finance"
    }],
    "action": "approve",
    "explain": true
  }'
```

The response includes `decision`, `deny_code`, `reason`, `trace_id`, matched candidates, and audit metadata. Inline context requires an API key because it is server-side trusted input.

## Trust Boundary

Inline context is trusted server-side input. Build it from your authenticated session and database state. Do not forward browser-provided actor, grants, or resource ownership fields directly into Plystra.

## Inspect

```bash
curl -s -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" http://localhost:8080/api/v1/capabilities
curl -s -H "X-Plystra-API-Key: $PLYSTRA_API_KEY" http://localhost:8080/api/v1/resource-types
curl -s -H "Authorization: Bearer $PLYSTRA_ACCESS_TOKEN" http://localhost:8080/api/v1/audit/logs
```
