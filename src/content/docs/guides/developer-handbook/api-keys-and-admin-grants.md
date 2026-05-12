---
title: API Keys and Admin Grants
description: Create scoped API keys safely and understand the admin grant permission model.
---

## Creating API Keys Safely

A caller can create an API key only when it has `api_keys:create` for the target scope. The caller can only delegate permission keys it already holds for that same target scope.

Create a Space-scoped API key for a billing service:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/api-keys" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "ak_billing_service_prod",
    "name": "billing-service-prod",
    "level": "space",
    "space_id": "space_acme",
    "permission_keys": ["authz:check", "resources:read"],
    "expires_at": "2026-12-31T23:59:59Z"
  }'
```

The response returns `data.api_key` exactly once. Store it in your secret manager immediately.

Production rules:

- Use the narrowest level: prefer `group` over `space`, and `space` over `instance`.
- Grant only required permission keys.
- Set an expiration for service keys.
- Rotate keys by creating a new key, deploying it, verifying traffic, then revoking the old key.
- Never use API keys to create human admin grants. Core rejects AdminGrant create/revoke through API key credentials.

## Admin Grants

Admin grants protect Core management APIs. They do not grant business resource permissions by themselves.

| Level | Scope | Can create instance admins? | Typical use |
|---|---|---|---|
| `instance_super_admin` | Whole instance | Yes | Owner bootstrap and break-glass operations. |
| `instance_admin` | Whole instance, permission-key limited | No, unless also super. | Platform operator for specific domains. |
| `space_admin` | One Space | No | Tenant admin. |
| `group_admin` | One Group subtree | No | Department or folder admin. |

Create a Space admin that can read users in one Space:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/admin/grants" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_ops",
    "level": "space_admin",
    "space_id": "space_acme",
    "permission_key": "users:read"
  }'
```

Only a user session can create or revoke AdminGrants. API keys cannot create or revoke human admin grants, even when they hold `admin_grants:manage`.

Core prevents revoking the last active instance super admin grant.

## Permission Key Rules

Permission keys are lowercase `domain:action` strings.

Valid examples:

```text
users:read
users:manage
api_keys:create
admin_grants:manage
resources:read
resources:manage
authz:check
```

Special matching rules:

| Grant key | Covers |
|---|---|
| `*` | Everything, but only meaningful for trusted human instance grants. |
| `domain:*` | All actions in that domain. |
| `domain:manage` | All actions in that domain, including `domain:read`. |
| Exact key | Only that key. |

Invalid examples:

```text
*:read
Users:read
users
users:
users:read/write
users:read:extra
```
