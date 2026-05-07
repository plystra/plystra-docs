---
title: Integrate Your App
description: A copy-paste path for connecting an existing backend to Plystra Core v1.0 authorization.
---

This guide shows the shortest practical path from an existing business API to a working Plystra authorization check.

By the end, your backend can ask Plystra:

```text
Can Alice, acting as Finance Reviewer, approve expense_report_001 in Finance APAC?
```

and get an explainable `allow` or `deny` decision with an audit trace.

## Integration Shape

Map your application concepts to Plystra first:

| Your application | Plystra Core | Example |
|---|---|---|
| Tenant, company, workspace | `Space` | `space_contoso` |
| Department, project, folder, org unit | `Group` | `finance.apac` |
| Login account | `User` | `user_docs_alice` |
| Business actor inside a tenant | `Member` | `member_docs_finance_reviewer` |
| User can act as Member | `UserMember` | `um_docs_alice_finance_reviewer` |
| Business object | `Resource` | `expense_report_001` |
| Business object type | `ResourceType` | `expense_report` |
| Business operation | `ResourceAction` | `approve` |
| Permission rule | `Permission` | `expense_report.approve.group_tree` |
| Role assignment | `MemberRole` | Finance Reviewer has Finance Approver in `finance` |

The important identity rule is:

```text
User -> UserMember -> Member -> Space
```

Your backend should send that actor tuple to Plystra when it protects a business operation.

## 0. Set Client Variables

For local development, use the admin token from `.env`:

```bash
export PLYSTRA_URL=http://localhost:8080
export PLYSTRA_ADMIN_TOKEN=change-me-admin-token-at-least-32-characters
```

PowerShell:

```powershell
$env:PLYSTRA_URL = "http://localhost:8080"
$env:PLYSTRA_ADMIN_TOKEN = "change-me-admin-token-at-least-32-characters"
```

All management APIs below require:

```text
X-Plystra-Admin-Token: <PLYSTRA_ADMIN_TOKEN>
```

Keep this token on your server side only. Do not expose it to browsers or mobile clients.

The create calls in this guide are meant for a fresh local development database. If you run them again and receive `409 Conflict`, the record already exists; keep using the existing record or change the example IDs.

## 1. Check the Seeded Demo First

Run the API server, then call the built-in Finance demo decision:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/authz/check" \
  -H "Content-Type: application/json" \
  -H "X-Plystra-Admin-Token: $PLYSTRA_ADMIN_TOKEN" \
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

PowerShell:

```powershell
curl.exe -s -X POST "$env:PLYSTRA_URL/api/v1/authz/check" `
  -H "Content-Type: application/json" `
  -H "X-Plystra-Admin-Token: $env:PLYSTRA_ADMIN_TOKEN" `
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

Expected result:

```json
{
  "data": {
    "decision": "allow",
    "deny_code": null
  }
}
```

The real response includes actor, resource, matched permission candidates, scope checks, and audit metadata.

## 2. Register Your Resource Type

Create the business object type and actions your app wants to protect. This example uses `expense_report` so it can run alongside the seeded `invoice` demo data.

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/resource-types" \
  -H "Content-Type: application/json" \
  -H "X-Plystra-Admin-Token: $PLYSTRA_ADMIN_TOKEN" \
  -d '{
    "id": "rt_expense_report",
    "key": "expense_report",
    "display_name": "Expense Report",
    "description": "Employee expense report",
    "status": "active",
    "source": "core"
  }'
```

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/resource-types/expense_report/actions" \
  -H "Content-Type: application/json" \
  -H "X-Plystra-Admin-Token: $PLYSTRA_ADMIN_TOKEN" \
  -d '{
    "id": "ra_expense_report_approve",
    "key": "approve",
    "display_name": "Approve",
    "risk_level": "high",
    "audit_default": true
  }'
```

If you use the built-in `resources` table to mirror external objects, register the internal mapping:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/resource-types/expense_report/mapping" \
  -H "Content-Type: application/json" \
  -H "X-Plystra-Admin-Token: $PLYSTRA_ADMIN_TOKEN" \
  -d '{
    "id": "rm_expense_report_internal",
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

## 3. Create a Space and Groups

Create the tenant or workspace:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces" \
  -H "Content-Type: application/json" \
  -H "X-Plystra-Admin-Token: $PLYSTRA_ADMIN_TOKEN" \
  -d '{
    "id": "space_contoso",
    "name": "Contoso",
    "slug": "contoso",
    "type": "customer",
    "status": "active"
  }'
```

Create an authorization tree:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_contoso/groups" \
  -H "Content-Type: application/json" \
  -H "X-Plystra-Admin-Token: $PLYSTRA_ADMIN_TOKEN" \
  -d '{
    "id": "group_contoso_finance",
    "name": "Finance",
    "display_name": "Finance",
    "path": "finance",
    "status": "active"
  }'
```

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_contoso/groups" \
  -H "Content-Type: application/json" \
  -H "X-Plystra-Admin-Token: $PLYSTRA_ADMIN_TOKEN" \
  -d '{
    "id": "group_contoso_finance_apac",
    "parent_group_id": "group_contoso_finance",
    "name": "Finance APAC",
    "display_name": "Finance APAC",
    "path": "finance.apac",
    "status": "active"
  }'
```

For `group_tree` scope, Plystra checks that the target group path is equal to the anchor path or starts with `anchor_path + "."`. Here, `finance.apac` is inside `finance`.

## 4. Create the Actor Identity Chain

Create the login identity:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/users" \
  -H "Content-Type: application/json" \
  -H "X-Plystra-Admin-Token: $PLYSTRA_ADMIN_TOKEN" \
  -d '{
    "id": "user_docs_alice",
    "email": "alice@example.com",
    "status": "active"
  }'
```

Create the business actor inside the Space:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_contoso/members" \
  -H "Content-Type: application/json" \
  -H "X-Plystra-Admin-Token: $PLYSTRA_ADMIN_TOKEN" \
  -d '{
    "id": "member_docs_finance_reviewer",
    "display_name": "Finance Reviewer",
    "member_type": "human",
    "status": "active"
  }'
```

Connect the User to the Member:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_contoso/user-members" \
  -H "Content-Type: application/json" \
  -H "X-Plystra-Admin-Token: $PLYSTRA_ADMIN_TOKEN" \
  -d '{
    "id": "um_docs_alice_finance_reviewer",
    "user_id": "user_docs_alice",
    "member_id": "member_docs_finance_reviewer",
    "relation_type": "login",
    "is_primary": true,
    "status": "active"
  }'
```

If your application already owns login, you usually create `User` for traceability and send the actor tuple from your trusted backend. You do not need to use Plystra's `/auth/login` flow unless you want Plystra Core sessions.

## 5. Create Role, Permission, and Grant

Create a permission for expense report approval under a group tree:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/permissions" \
  -H "Content-Type: application/json" \
  -H "X-Plystra-Admin-Token: $PLYSTRA_ADMIN_TOKEN" \
  -d '{
    "id": "perm_expense_report_approve_group_tree",
    "resource": "expense_report",
    "action": "approve",
    "scope": "group_tree",
    "description": "Approve expense reports inside the assigned group tree",
    "status": "active"
  }'
```

Create a Space-local role:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_contoso/roles" \
  -H "Content-Type: application/json" \
  -H "X-Plystra-Admin-Token: $PLYSTRA_ADMIN_TOKEN" \
  -d '{
    "id": "role_contoso_finance_approver",
    "key": "finance_approver",
    "name": "Finance Approver",
    "description": "Can approve expense reports in the assigned Finance tree",
    "status": "active"
  }'
```

Attach the permission to the role:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/role-permissions" \
  -H "Content-Type: application/json" \
  -H "X-Plystra-Admin-Token: $PLYSTRA_ADMIN_TOKEN" \
  -d '{
    "id": "rp_contoso_finance_approver_expense_report_approve",
    "role_id": "role_contoso_finance_approver",
    "permission_id": "perm_expense_report_approve_group_tree",
    "audit_space_id": "space_contoso"
  }'
```

Grant the role to the Member at the Finance group:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_contoso/member-roles" \
  -H "Content-Type: application/json" \
  -H "X-Plystra-Admin-Token: $PLYSTRA_ADMIN_TOKEN" \
  -d '{
    "id": "mr_docs_finance_reviewer_approver_finance",
    "member_id": "member_docs_finance_reviewer",
    "role_id": "role_contoso_finance_approver",
    "scope_anchor_group_id": "group_contoso_finance",
    "status": "active"
  }'
```

## 6. Register a Resource Instance

Mirror the business object you want to protect:

```bash
curl -s -X POST "$PLYSTRA_URL/api/v1/spaces/space_contoso/resources" \
  -H "Content-Type: application/json" \
  -H "X-Plystra-Admin-Token: $PLYSTRA_ADMIN_TOKEN" \
  -d '{
    "id": "expense_report_001",
    "resource_type": "expense_report",
    "external_id": "er-001",
    "display_name": "Expense Report 001",
    "group_id": "group_contoso_finance_apac",
    "owner_member_id": "member_docs_finance_reviewer",
    "visibility": "private",
    "status": "active",
    "metadata": {
      "amount": 1200,
      "currency": "USD"
    }
  }'
```

## 7. Protect a Business Endpoint

Call Plystra before your application performs the business operation.

Node/Express example:

```ts
async function requirePlystraAllow(input: {
  userId: string;
  memberId: string;
  userMemberId: string;
  spaceId: string;
  resourceType: string;
  resourceId: string;
  action: string;
}) {
  const response = await fetch(`${process.env.PLYSTRA_URL}/api/v1/authz/check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Plystra-Admin-Token": process.env.PLYSTRA_ADMIN_TOKEN!,
    },
    body: JSON.stringify({
      actor: {
        user_id: input.userId,
        member_id: input.memberId,
        user_member_id: input.userMemberId,
        space_id: input.spaceId,
      },
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      action: input.action,
    }),
  });

  if (!response.ok) {
    throw new Error(`Plystra authz call failed: ${response.status}`);
  }

  const envelope = await response.json();
  const decision = envelope.data;
  if (decision.decision !== "allow") {
    const denyCode = decision.deny_code ?? "DENIED";
    const error = new Error(`Forbidden by Plystra: ${denyCode}`);
    (error as any).status = 403;
    (error as any).denyCode = denyCode;
    throw error;
  }

  return decision;
}

app.post("/expense-reports/:id/approve", async (req, res) => {
  await requirePlystraAllow({
    userId: req.user.id,
    memberId: req.user.activeMemberId,
    userMemberId: req.user.activeUserMemberId,
    spaceId: req.user.activeSpaceId,
    resourceType: "expense_report",
    resourceId: req.params.id,
    action: "approve",
  });

  await approveExpenseReport(req.params.id);
  res.status(204).end();
});
```

Go example:

```go
type AuthzRequest struct {
	Actor struct {
		UserID       string `json:"user_id"`
		MemberID     string `json:"member_id"`
		UserMemberID string `json:"user_member_id"`
		SpaceID      string `json:"space_id"`
	} `json:"actor"`
	ResourceType string `json:"resource_type"`
	ResourceID   string `json:"resource_id"`
	Action       string `json:"action"`
}

type AuthzEnvelope struct {
	Data struct {
		Decision string  `json:"decision"`
		DenyCode *string `json:"deny_code"`
	} `json:"data"`
}
```

Send the request to `/api/v1/authz/check`, require `Decision == "allow"`, and translate any deny into a `403` in your own API.

## 8. Test a Deny Case

Create a Legal group and move a test expense report there, or check an expense report whose `group_id` is outside `group_contoso_finance`. The same actor should receive:

```json
{
  "data": {
    "decision": "deny",
    "deny_code": "SCOPE_OUT_OF_BOUNDS"
  }
}
```

Common deny codes:

| Code | Meaning |
|---|---|
| `USER_MEMBER_REVOKED` | The `UserMember` binding is not active. |
| `USER_MEMBER_EXPIRED` | The binding expired. |
| `ACTOR_SPACE_MISMATCH` | Actor and target are not in the same Space. |
| `NO_MATCHING_PERMISSION` | No active role permission matches resource/action. |
| `SCOPE_OUT_OF_BOUNDS` | A matching permission exists but its scope does not cover the target. |
| `GLOBAL_SCOPE_DISABLED` | `global` scope is reserved and disabled in v1.0. |
| `RESOURCE_TYPE_NOT_REGISTERED` | The resource type is missing from the Resource Registry. |
| `RESOURCE_ACTION_NOT_REGISTERED` | The action is missing for the resource type. |

## 9. Read the Audit Trail

Every `authz/check` and `authz/explain` writes a decision trace when audit mode is enabled:

```bash
curl -s "$PLYSTRA_URL/api/v1/spaces/space_contoso/audit-logs?resource_type=expense_report&resource_id=expense_report_001" \
  -H "X-Plystra-Admin-Token: $PLYSTRA_ADMIN_TOKEN"
```

The audit log stores the acting user, member, user-member binding, action, resource, decision, deny code, request ID, server-derived IP and user agent, plus trace JSON.

## Production Integration Rules

- Keep `PLYSTRA_ADMIN_TOKEN` server-side. Browser clients should call your backend, not Plystra management APIs directly.
- Use Plystra `User` records for traceability even if your main application owns login.
- Store the active `member_id`, `user_member_id`, and `space_id` in your application session after the user chooses a business identity.
- Call `/api/v1/authz/check` before the protected business mutation.
- Treat deny decisions as normal business outcomes and surface the `deny_code` in logs.
- Keep `DATA_CONSOLE_ENABLED=false` and `METRICS_ENABLED=false` unless you explicitly need them.
- In production, configure strong secrets, non-wildcard CORS origins, a public URL, and a real PostgreSQL password.

## What to Build Next

After this path works, add your own:

| Need | Plystra object |
|---|---|
| Read-only page access | `permission` with action `read` |
| User-owned records | `self` scope and `owner_member_id` |
| Department-wide access | `group` scope and `group_id` |
| Department plus descendants | `group_tree` scope and `scope_anchor_group_id` |
| Tenant-wide operator | `space` scope |

For exact endpoint groups and response envelopes, continue with [HTTP API](/guides/http-api/).
