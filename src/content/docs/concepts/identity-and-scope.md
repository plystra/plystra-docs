---
title: Identity and Scope
description: Understand Plystra's actor model, permission scopes, deny codes, and audit traces.
---

Plystra's core invariant is that the login account is not the same thing as the business identity that acts. Authorization evaluates the full actor tuple:

```text
User -> UserMember -> Member -> Space
```

## Identity Objects

| Object | Meaning in current Core |
|---|---|
| `User` | Login account. It stores email, optional username and phone, status, metadata, and an internal `password_hash`. API responses never return `password_hash`. |
| `Member` | Business identity inside one Space. Roles are granted to Members, not directly to Users. |
| `UserMember` | Explicit bridge from User to Member in a Space. It records relation type, active/revoked status, primary flag, optional expiry, and revocation metadata. |
| `Space` | Tenant or workspace boundary. Actor, grants, groups, and target resources must belong to the same Space. |

`UserMember` is security-critical. Revoked, inactive, or expired bindings deny authorization even when the Member has a matching role.

## Authorization Input

The API accepts the actor either as a nested object or legacy flattened fields:

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

For HTTP requests, the server owns canonical request metadata:

- `request_id` comes from middleware.
- `ip` comes from the server-derived remote IP and trusted proxy logic.
- `user_agent` comes from the HTTP header.

Body-provided `request_id`, `ip`, and `user_agent` are ignored by the HTTP authz handler.

## Scope Rules

| Scope | Rule | Result |
|---|---|---|
| `self` | `resource.owner_member_id == actor.member_id` | Covers resources owned by the active Member. |
| `group` | `target_group_id = scope_anchor_group_id` | Covers only the exact anchor Group. |
| `group_tree` | `target_path = anchor_path OR target_path LIKE anchor_path || '.%'` | Covers the anchor Group and descendants. |
| `space` | `resource.space_id == actor.space_id` | Covers resources in the active Space. |
| `global` | Disabled for ordinary Members | Always denies with `GLOBAL_SCOPE_DISABLED` in v1.0. |

The `group_tree` rule is deliberately strict. An anchor of `finance` covers `finance` and `finance.apac`, but not `finance-old`.

## Decision Order

The current engine evaluates:

1. Required input fields.
2. Actor, UserMember, Member, and Space state.
3. Resource Registry registration and action validity.
4. Target resource and group snapshot.
5. Same-Space invariant across actor, target, grants, and scope anchors.
6. Matching permission candidates filtered by Member, resource type, and action.
7. Scope coverage. Any covered candidate allows the action.
8. Audit write for both allow and deny decisions.

## Deny Codes

| Code | Meaning |
|---|---|
| `ACTOR_USER_INACTIVE` | The User is not active. |
| `ACTOR_MEMBER_INACTIVE` | The Member is not active. |
| `USER_MEMBER_REVOKED` | The UserMember binding is not active. |
| `USER_MEMBER_EXPIRED` | The UserMember binding has expired. |
| `SPACE_INACTIVE` | The active Space is not active. |
| `CROSS_SPACE_VIOLATION` | Actor, target, grant, or scope anchor crosses Space boundaries. |
| `NO_MATCHING_PERMISSION` | No active role permission matched the resource/action pair. |
| `SCOPE_ANCHOR_MISSING` | A group-based grant is missing a scope anchor. |
| `TARGET_GROUP_MISSING` | The target resource has no group for group-based scope resolution. |
| `SCOPE_OUT_OF_BOUNDS` | Matching permissions exist but do not cover the target scope. |
| `GLOBAL_SCOPE_DISABLED` | `global` is reserved and disabled in v1.0. |
| `INVALID_RESOURCE_TYPE` | The resource type is not registered. |
| `INVALID_RESOURCE_ACTION` | The action is not registered for the resource type. |

## Audit Trace

Every authorization decision is written through the store as an AuditLog. The trace includes:

- `trace_version`, currently `1.0`.
- actor snapshots for User, Member, and UserMember.
- Space and target resource snapshots.
- Resource Registry snapshot.
- matched permission candidates and scope checks.
- request metadata.
- final decision, deny code, and reason.

AuditLog is append-only. Ent schema hooks and store hooks block updates and deletes.

## Resource Registry

Permissions are not evaluated as raw strings only. The engine first resolves:

- registered `resource_types`
- registered `resource_actions`
- `resource_mappings`

For the Finance Reviewer demo, `invoice` is registered with actions such as `read`, `create`, `approve`, `reject`, and `delete`. `approve` and `reject` are high-risk actions; `delete` is critical.
