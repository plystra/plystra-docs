---
title: Kernel API Reference
description: Plystra Phase 1 API response envelope, authentication, and endpoint list.
---

# Kernel API

The Kernel API uses the `/api/v1` prefix and returns JSON envelopes.

## Public

- `GET /api/v1/health`
- `GET /api/v1/ready`
- `GET /api/v1/version`

## Protected

All protected routes require `X-Plystra-API-Key`.

- `GET /api/v1/capabilities`
- `GET /api/v1/resource-types`
- `POST /api/v1/authz/check`
- `POST /api/v1/authz/explain`
- `GET /api/v1/audit/logs`
- `GET /api/v1/audit/logs/{id}`

## Context Mode Request

```json
{
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
}
```

## Response Shape

```json
{
  "data": {
    "allow": true,
    "decision": "allow",
    "deny_code": null,
    "reason": "at least one matching permission grant covers the target resource",
    "trace_id": "trc_...",
    "audit_log_id": "audit_..."
  },
  "request_id": "req_..."
}
```

## Trust Boundary

Inline actor, resource, and grant fields are trusted server-side input. Applications must derive them from authenticated backend state, not from untrusted browser payloads.
