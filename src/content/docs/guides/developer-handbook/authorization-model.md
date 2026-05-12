---
title: Authorization Model
description: Learn the authz request contract, decision semantics, deny codes, and scope rules.
---

## Choose the Right Credential

Pick exactly one credential pattern per call path.

| Use case | Credential | Where to store it | Notes |
|---|---|---|---|
| User-driven Core admin UI | Bearer access token from `/api/v1/auth/login` | Encrypted server-side session or secure backend token store. | The User must have an active `AdminGrant`. |
| Backend authorization checks for application traffic | Scoped API key | Secret manager, environment injection, or workload identity secret. | Must include `authz:check`; API key calls must provide `actor`. |
| Backend management automation | Scoped API key | Secret manager. | Grant only the required permission keys and scope. |
| One-off bootstrap or local demo | Password login | Local dev only. | SDKs retain password login, but it should not be the routine backend pattern. |
| Browser/mobile direct use | None for API keys | Never store API keys client-side. | Browser clients should talk to your backend, not directly to management APIs. |

## The Authorization Contract

The canonical HTTP request is:

```json
{
  "actor": {
    "user_id": "user_alice",
    "member_id": "member_finance_reviewer",
    "user_member_id": "um_alice_finance_reviewer",
    "space_id": "space_acme"
  },
  "resource_type": "invoice",
  "resource_id": "invoice_001",
  "action": "approve"
}
```

Required fields:

| Field | Required when | Meaning |
|---|---|---|
| `actor.user_id` | Always for API key calls. Optional for Bearer session calls. | Real login/audit user. |
| `actor.member_id` | Always for API key calls. Optional for Bearer session calls. | Business actor in the Space. |
| `actor.user_member_id` | Always for API key calls. Optional for Bearer session calls. | Active binding proving the User may act as the Member. |
| `actor.space_id` | Always for API key calls. Optional for Bearer session calls. | Tenant boundary. |
| `resource_type` | Always, unless you use `resource.type`. | Registered resource type key. |
| `resource_id` | Always, unless you use `resource.id`. | Core resource id. |
| `action` | Always. | Action key registered under the resource type. |

Bearer session calls may omit `actor`; Core uses the session's active actor chosen during login or by `POST /api/v1/actor/switch-member`.

API key calls must include `actor`; Core cannot infer a human actor from a machine key.

HTTP authz requests must not include body `request_id`, `ip`, or `user_agent`. Core derives the canonical request id, IP, and user agent from middleware and the HTTP request.

## Decision Semantics

Core allows a request only when all of these are true:

1. The `User` exists and is active.
2. The `Space` exists and is active.
3. The `Member` exists, is active, and belongs to the same Space.
4. The `UserMember` exists, is active, belongs to the same User, Member, and Space, and is not expired or revoked.
5. The resource type and action are registered and active.
6. The target resource exists and is active.
7. The target resource belongs to the same Space as the actor.
8. At least one active role grant gives the Member the requested permission.
9. The permission scope covers the target resource.

The important deny codes for application developers are:

| Code | Typical cause | What to fix |
|---|---|---|
| `ACTOR_NOT_FOUND` | Actor ids do not resolve. | Check User, Member, UserMember, and Space ids. |
| `USER_INACTIVE` | User is disabled or deleted. | Restore or use another User. |
| `USER_MEMBER_REVOKED` | Binding was revoked, disabled, or expired. | Create or restore an active UserMember binding. |
| `SPACE_MISMATCH` | Actor and target resource are in different Spaces. | Do not cross tenant boundaries. |
| `RESOURCE_NOT_FOUND` | Resource row is missing or inactive. | Register or restore the resource. |
| `NO_MATCHING_PERMISSION` | No active Role/Permission candidate matches resource and action. | Grant a Role with the required Permission. |
| `SCOPE_OUT_OF_BOUNDS` | Role exists but its scope anchor does not cover the target. | Move the resource, adjust group anchor, or add a narrower grant. |
| `GLOBAL_SCOPE_DISABLED` | `global` scope is disabled in v1.0. | Use `space`, `group_tree`, or `self`. |

## Scope Rules

| Permission scope | Covers | Requires |
|---|---|---|
| `space` | Any target resource in the actor Space. | Actor and resource must share `space_id`. |
| `group_tree` | Target group equals anchor group or is a descendant. | `MemberRole.scope_anchor_group_id` and target `group_id`. |
| `self` | Target resource owner equals actor Member. | Resource mapping must expose `owner_member_id`. |
| `global` | Disabled in v1.0. | Do not use for production permissions. |

For `group_tree`, the rule is exact path match or safe dot-prefix:

```text
target_path = anchor_path OR target_path starts with anchor_path + "."
```

That means `finance` covers `finance.apac`, but does not cover `financeops`.
