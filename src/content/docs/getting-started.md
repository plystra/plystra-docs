---
title: Getting Started
description: Run Plystra locally and protect one action with Context Mode.
---

Plystra Phase 1 starts with the `plystra/plystra` runtime. You do not need to migrate users, organizations, roles, or resources into Plystra before your first authorization check.

## Prerequisites

- Go
- PostgreSQL
- A server-side API key created through the protected Core API

## Start Plystra

Linux and macOS:

```bash
cd ~/src/plystra/plystra
export DATABASE_URL="postgres://plystra:plystra@localhost:5432/plystra?sslmode=disable"
./scripts/build-capabilities.sh
go run ./cmd/plystractl migrate up
go run ./cmd/plystractl migrate verify
go run ./cmd/plystrad
```

Windows PowerShell:

```powershell
cd C:\Users\i\Documents\GitHub\plystra\plystra
$env:DATABASE_URL = "postgres://plystra:plystra@localhost:5432/plystra?sslmode=disable"
.\scripts\build-capabilities.ps1
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

Protected server-to-server routes require `X-Plystra-API-Key`. User/admin routes use the login session flow.

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

The response includes `allow`, `decision`, `deny_code`, `reason`, `trace_id`, and `audit_log_id`.

## Trust Boundary

Inline context is trusted server-side input. Build it from your authenticated session and database state. Do not forward browser-provided actor, grants, or resource ownership fields directly into Plystra.

## Inspect

```bash
curl -s -H "X-Plystra-API-Key: $PLYSTRA_API_KEY" http://localhost:8080/api/v1/capabilities
curl -s -H "X-Plystra-API-Key: $PLYSTRA_API_KEY" http://localhost:8080/api/v1/resource-types
curl -s -H "X-Plystra-API-Key: $PLYSTRA_API_KEY" http://localhost:8080/api/v1/audit/logs
```
