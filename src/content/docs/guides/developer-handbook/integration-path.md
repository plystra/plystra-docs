---
title: Copy-Paste Integration Path
description: Create a complete invoice approval authorization setup with concrete HTTP calls.
---

## Copy-Paste Integration Path

The following path creates a minimal `invoice.approve` authorization setup. It assumes:

```bash
export PLYSTRA_URL=http://localhost:8080
export PLYSTRA_TOKEN=<alice-or-super-admin-access-token>
```

### 1. Log In as an Admin

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"plystra-demo"}'
```

Store the returned `data.access_token` in `PLYSTRA_TOKEN`.

### 2. Register the Resource Type

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/resource-types" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "rt_invoice",
    "key": "invoice",
    "display_name": "Invoice",
    "description": "Invoices mirrored from the billing system",
    "source": "core"
  }'
```

### 3. Register the Action

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/resource-types/invoice/actions" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "ra_invoice_approve",
    "key": "approve",
    "display_name": "Approve invoice",
    "risk_level": "high",
    "audit_default": true
  }'
```

### 4. Register the Mapping

For Core-managed resources, use the internal `resources` table mapping:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/resource-types/invoice/mapping" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "rm_invoice",
    "storage_kind": "internal_table",
    "table_name": "resources",
    "id_field": "id",
    "space_field": "space_id",
    "group_field": "group_id",
    "owner_member_field": "owner_member_id",
    "visibility_field": "visibility",
    "metadata_field": "metadata",
    "status": "active"
  }'
```

### 5. Create the Space

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "space_acme",
    "name": "Acme",
    "slug": "acme",
    "type": "customer",
    "status": "active"
  }'
```

### 6. Create Groups

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_acme/groups" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "group_finance",
    "name": "Finance",
    "path": "finance"
  }'

curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_acme/groups" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "group_finance_apac",
    "parent_group_id": "group_finance",
    "name": "APAC",
    "path": "finance.apac"
  }'
```

### 7. Create User, Member, and UserMember

Create a User:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/users" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "user_alice",
    "email": "alice@example.com",
    "password": "plystra-demo",
    "status": "active"
  }'
```

Create a Member in the Space:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_acme/members" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "member_finance_reviewer",
    "display_name": "Finance Reviewer",
    "member_type": "human",
    "status": "active"
  }'
```

Bind the User to the Member:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_acme/user-members" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "um_alice_finance_reviewer",
    "user_id": "user_alice",
    "member_id": "member_finance_reviewer",
    "relation_type": "login",
    "is_primary": true,
    "status": "active"
  }'
```

### 8. Create Permission, Role, and Grants

Create a Permission:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/permissions" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "perm_invoice_approve_group_tree",
    "resource": "invoice",
    "action": "approve",
    "scope": "group_tree",
    "description": "Approve invoices within a group subtree"
  }'
```

Create a Role:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_acme/roles" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "role_finance_approver",
    "key": "finance_approver",
    "name": "Finance Approver"
  }'
```

Attach the Permission to the Role:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/role-permissions" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "rp_finance_approver_invoice_approve",
    "role_id": "role_finance_approver",
    "permission_id": "perm_invoice_approve_group_tree"
  }'
```

Grant the Role to the Member, anchored at `group_finance`:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_acme/member-roles" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "mr_finance_reviewer_approver",
    "member_id": "member_finance_reviewer",
    "role_id": "role_finance_approver",
    "scope_anchor_group_id": "group_finance",
    "status": "active"
  }'
```

### 9. Register the Target Resource

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/resources" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "invoice_001",
    "space_id": "space_acme",
    "resource_type": "invoice",
    "external_id": "billing-system-invoice-001",
    "group_id": "group_finance_apac",
    "owner_member_id": "member_finance_reviewer",
    "display_name": "Invoice 001",
    "visibility": "private",
    "status": "active"
  }'
```

### 10. Check Authorization

Using an API key:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/authz/check" \
  -H "X-Plystra-API-Key: $PLYSTRA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "actor": {
      "user_id": "user_alice",
      "member_id": "member_finance_reviewer",
      "user_member_id": "um_alice_finance_reviewer",
      "space_id": "space_acme"
    },
    "resource_type": "invoice",
    "resource_id": "invoice_001",
    "action": "approve"
  }'
```

Using a Bearer access token and the session active actor:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/authz/check" \
  -H "Authorization: Bearer $PLYSTRA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resource_type": "invoice",
    "resource_id": "invoice_001",
    "action": "approve"
  }'
```

An allow response has `data.decision` equal to `allow`. A deny response still returns a decision object when the request is valid, with `decision = deny` and a `deny_code`.
