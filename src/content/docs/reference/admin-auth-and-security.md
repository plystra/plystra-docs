---
title: Admin Auth and Security
description: Exact security model for Plystra Core management APIs, user sessions, admin grants, scoped API keys, and anti-escalation rules.
---

This reference documents the current Core management authorization model in `1.0.0-rc104`. It is intentionally explicit because this layer protects the control plane.

## Core Rule

Plystra Core has no admin token. Every non-public management route must be authorized by one of these credentials:

| Credential | Header | Principal | Intended use |
|---|---|---|---|
| User access token | `Authorization: Bearer <access_token>` | A `User` with active `AdminGrant` rows. | Human admin consoles, operators, user-driven management flows. |
| API key | `X-Plystra-API-Key: <api_key>` or `Authorization: Bearer ply_ak_...` | A scoped `ApiKey` row with explicit permission keys. | Server-to-server automation and authorization checks. |

Public routes are limited to health, ready, version, protected registration, login, refresh, logout, actor context, actor switch-member, and the disabled/protected metrics handler. Sensitive APIs are not intended to be anonymous.

## AdminGrant Levels

| Level | Scope fields | What it can reach | Notes |
|---|---|---|---|
| `instance_super_admin` | no `space_id`, no `group_id` | Entire instance and all permission keys. | Only user sessions are considered super admin. API keys are never super admins. |
| `instance_admin` | no `space_id`, no `group_id` | Entire instance for matching `permission_key`. | Cannot create or revoke instance-level grants unless the same user also has super admin. |
| `space_admin` | `space_id` required | Matching permission key inside exactly that Space. | Cannot see or mutate instance-level AdminGrants or instance API keys. |
| `group_admin` | `group_id` required; `space_id` is resolved from the group | Matching permission key inside the group subtree. | Does not cover sibling groups or whole-space list operations. |

An AdminGrant is active only when:

- `status = active`
- `deleted_at IS NULL`
- `revoked_at IS NULL`
- `expires_at IS NULL OR expires_at > now`

The associated User must also remain active.

## API Key Levels

| Level | Scope fields | What it can reach |
|---|---|---|
| `instance` | no `space_id`, no `group_id` | Matching permission key across the instance. |
| `space` | `space_id` required | Matching permission key inside exactly that Space. |
| `group` | `group_id` required; `space_id` is resolved from the group | Matching permission key inside the group subtree. |

An API key is active only when:

- `status = active`
- `deleted_at IS NULL`
- `revoked_at IS NULL`
- `expires_at IS NULL OR expires_at > now`
- submitted plaintext token HMAC-matches the stored `key_hash`

Core stores only HMAC hashes for API keys. The plaintext key is returned only once when the key is created.

## Permission Key Matching

Permission keys use lowercase `domain:action`.

| Grant key | Required key it matches |
|---|---|
| `*` | Any key. |
| exact key, such as `users:read` | The same exact key. |
| `domain:*` | Any action in that domain. |
| `domain:manage` | Any action in that domain, including read, create, revoke, and other domain-specific actions. |

Invalid keys are rejected:

```text
*:read
Users:read
users
users:
users:read:extra
users:read/write
```

## Route Permission Matrix

The middleware resolves the required permission from method and path before the handler runs.

| Route group | Required permission |
|---|---|
| `GET /api/v1/console/overview` | `instance:read` |
| `POST /api/v1/authz/check` | `authz:check` |
| `POST /api/v1/authz/explain` | `authz:check` |
| `/metrics` when enabled without metrics token | `metrics:read` |
| `GET /api/v1/admin/me` | `instance:read` |
| `GET /api/v1/admin/grants` | `admin_grants:read` |
| `GET /api/v1/admin/grants/{id}` | `admin_grants:read`, resolved to that grant's scope |
| `POST /api/v1/admin/grants` | `admin_grants:manage` |
| `POST /api/v1/admin/grants/{id}/revoke` | `admin_grants:manage`, resolved to that grant's scope |
| `GET /api/v1/api-keys` | `api_keys:read` |
| `GET /api/v1/api-keys/{id}` | `api_keys:read`, resolved to that key's scope |
| `POST /api/v1/api-keys` | `api_keys:create` |
| `POST /api/v1/api-keys/{id}/revoke` | `api_keys:revoke`, resolved to that key's scope |
| `GET /api/v1/audit/logs` | `audit:read`, optional `space_id` query scope |
| `GET /api/v1/audit/logs/{id}` | `audit:read`, resolved to the audit log's Space |
| `GET /api/v1/users*` | `users:read` |
| mutating `/api/v1/users*` | `users:manage` |
| `GET /api/v1/spaces*` | `spaces:read` |
| mutating `/api/v1/spaces*` | `spaces:manage` |
| `GET /api/v1/spaces/{space_id}/groups*` | `groups:read` in the Space or resolved Group |
| mutating `/api/v1/spaces/{space_id}/groups*` | `groups:manage` in the Space or resolved Group |
| `GET /api/v1/spaces/{space_id}/members*` | `members:read` in the Space |
| mutating `/api/v1/spaces/{space_id}/members*` | `members:manage` in the Space |
| `GET /api/v1/spaces/{space_id}/user-members*` | `user_members:read` in the Space |
| mutating `/api/v1/spaces/{space_id}/user-members*` | `user_members:manage` in the Space |
| `GET /api/v1/spaces/{space_id}/roles*` | `roles:read` in the Space |
| mutating role and member-role routes | `roles:manage` in the Space |
| `GET /api/v1/permissions*` and `GET /api/v1/role-permissions*` | `permissions:read` |
| mutating permission and role-permission routes | `permissions:manage` |
| `GET /api/v1/resource-types*` | `registry:read` |
| mutating resource type, action, and mapping routes | `registry:manage` |
| `GET /api/v1/resources` | `resources:read`, optionally scoped by `space_id` |
| `POST /api/v1/resources` | `resources:manage`, target scope resolved in handler |
| `GET /api/v1/resources/{type}/{id}` | `resources:read`, resolved to resource Space and Group |
| nested Space resource routes | `resources:read` or `resources:manage` in the Space or resolved Group |
| data preview routes | `data:read` or `data:manage`; feature disabled by default |
| plugin routes | `plugins:read` or `plugins:manage` |
| template routes | `templates:read` or `templates:manage` |

Handlers re-check target scope for routes where the middleware cannot know the target body yet, especially API key creation, AdminGrant creation, authorization checks, and resource mutations.

## Anti-Escalation Rules

These rules are enforced in handlers and covered by tests:

- A user can create an API key only if the user has `api_keys:create` for the target scope.
- A user can put permission keys on a new API key only if the user already holds those permission keys for the target scope.
- A space admin cannot create an instance API key.
- A space admin cannot create an API key in another Space.
- A space admin cannot read instance API keys.
- A space admin cannot read instance-level AdminGrants.
- A group admin cannot read sibling group resources.
- A group admin cannot list whole-space resources through a group grant.
- Only a user session can create or revoke AdminGrants.
- API keys cannot create or revoke human AdminGrants, even with `admin_grants:manage`.
- Only an instance super admin can create or revoke `instance_super_admin` or `instance_admin` grants.
- Core refuses to revoke the last active `instance_super_admin` grant.
- API keys with `*` are not considered instance super admins.

## Handler-Resolved Scope

Some create routes need to pass middleware before the request body is parsed. Middleware can temporarily allow a scoped principal through these domains:

```text
api_keys:*
admin_grants:*
authz:check
```

That pass-through is not the final authorization. The handler must then resolve the real target `space_id`, `group_id`, resource, or grant and deny if the principal is out of scope.

For existing objects, Core resolves the object's stored scope before deciding visibility. This prevents a Space admin from listing or reading instance-level API keys or AdminGrants.

## Session Auth Details

Registration route:

```http
POST /api/v1/auth/register
```

Registration is disabled unless an operator explicitly enables it. Ordinary registration requires `PLYSTRA_AUTH_REGISTRATION_ENABLED=true` and a matching `PLYSTRA_AUTH_REGISTRATION_TOKEN`; production also requires that token to be at least 32 characters. Ordinary registration is refused until at least one active `instance_super_admin` grant already exists.

First-super-admin bootstrap through registration is separate: set `PLYSTRA_BOOTSTRAP_REGISTRATION_ENABLED=true` and use `PLYSTRA_BOOTSTRAP_REGISTRATION_TOKEN`. This path is only available while no active `instance_super_admin` grant exists, creates the user, a personal Space/Member/UserMember, a Space admin grant, and the initial `instance_super_admin` grant in one transaction, then returns a session token pair.

Login route:

```http
POST /api/v1/auth/login
```

Body:

```json
{
  "email": "alice@example.com",
  "password": "plystra-demo"
}
```

Response includes:

```json
{
  "access_token": "ply_at_...",
  "refresh_token": "ply_rt_...",
  "token_type": "Bearer",
  "expires_at": "2026-05-12T01:00:00Z",
  "refresh_expires_at": "2026-06-11T01:00:00Z",
  "user": {},
  "actor": {},
  "available_members": []
}
```

Current token behavior:

- access token TTL is 15 minutes.
- refresh token TTL is 30 days.
- refresh rotates both access and refresh tokens.
- logout revokes by bearer access token or body refresh token.
- session token hashes use `PLYSTRA_SESSION_SECRET`.
- passwords are stored with Argon2id.
- password changes revoke existing sessions for that User.
- login is rate-limited by normalized email and source IP.

## API Key Details

Create route:

```http
POST /api/v1/api-keys
```

Body:

```json
{
  "name": "billing-service-prod",
  "level": "space",
  "space_id": "space_acme",
  "permission_keys": ["authz:check", "resources:read"],
  "expires_at": "2026-12-31T23:59:59Z",
  "metadata": {
    "owner": "billing-platform"
  }
}
```

Response includes `api_key` once:

```json
{
  "id": "ak_...",
  "name": "billing-service-prod",
  "key_prefix": "ply_ak_ak_...",
  "level": "space",
  "space_id": "space_acme",
  "permission_keys": ["authz:check", "resources:read"],
  "api_key": "ply_ak_ak_....secret"
}
```

Production handling:

- Store plaintext `api_key` in a secret manager.
- Do not log plaintext API keys.
- Use `PLYSTRA_API_KEY_SECRET` for HMAC hashing.
- During secret rotation, set `PLYSTRA_API_KEY_SECRET_PREVIOUS` to a comma-separated list of previous secrets.
- Revoke stale keys with `POST /api/v1/api-keys/{id}/revoke`.

## Authz Through Sessions vs API Keys

Bearer session call:

```json
{
  "resource_type": "invoice",
  "resource_id": "invoice_001",
  "action": "approve"
}
```

Core uses the session active actor.

API key call:

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

API keys must include the actor.

## What to Test in Your Integration

At minimum, add tests for:

- expected allow case.
- no matching permission deny.
- out-of-scope group deny.
- cross-space deny.
- revoked UserMember deny.
- inactive User deny.
- API key revoked deny.
- API key expired deny.
- API key cannot create AdminGrant.
- Space admin cannot access another Space.
- Group admin cannot access sibling Group.

Core's own test suite includes these boundaries, but your application should still test the way it maps application users and objects into Plystra ids.
