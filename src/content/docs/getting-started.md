---
title: Getting Started
description: Run the Plystra Kernel locally and protect one action with Context Mode.
---

Plystra Phase 1 starts with the Kernel runtime. You do not need to migrate users, organizations, roles, or resources into Plystra before your first authorization check.

## Prerequisites

- Go
- PostgreSQL
- A server-side API key value for local development

## Start Kernel

```powershell
cd kernel
$env:DATABASE_URL = "postgres://plystra:plystra@localhost:5432/plystra?sslmode=disable"
$env:PLYSTRA_API_KEY = "ply_kernel_secret"
go run .\cmd\plystrad migrate
go run .\cmd\plystrad migrate status
go run .\cmd\plystrad serve
```

The Kernel exposes public health, readiness, and version routes:

```bash
curl -s http://localhost:8080/api/v1/health
curl -s http://localhost:8080/api/v1/ready
curl -s http://localhost:8080/api/v1/version
```

Protected routes require `X-Plystra-API-Key`.

## Protect One Action

Context Mode lets your existing backend pass trusted actor, resource, and grant context inline.

```bash
curl -s -X POST http://localhost:8080/api/v1/authz/check \
  -H "Content-Type: application/json" \
  -H "X-Plystra-API-Key: ply_kernel_secret" \
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
curl -s -H "X-Plystra-API-Key: ply_kernel_secret" http://localhost:8080/api/v1/capabilities
curl -s -H "X-Plystra-API-Key: ply_kernel_secret" http://localhost:8080/api/v1/resource-types
curl -s -H "X-Plystra-API-Key: ply_kernel_secret" http://localhost:8080/api/v1/audit/logs
```
