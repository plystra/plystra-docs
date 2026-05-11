---
title: Explainable Identity Core
description: Migrated from the Core repository and updated for the current v1.0 codebase.
---

# Explainable Identity Core

Plystra v1.0 turns the Finance Reviewer prototype into a production-ready self-hosted authorization core.

## Package Boundary

The core package is `internal/authz`.

It accepts an explicit actor context and returns a decision-time trace:

```go
decision, err := authz.Check(ctx, store, authz.CheckInput{
    ActorUserID:       "user_alice",
    ActorMemberID:     "member_finance_reviewer",
    ActorUserMemberID: "um_alice_finance_reviewer",
    SpaceID:           "space_acme",
    ResourceType:      "invoice",
    ResourceID:        "invoice_001",
    Action:            "approve",
})
```

`authz.Explain` currently uses the same path as `authz.Check`. Both return the full trace and persist audit logs for allows and denies.

## Store Boundary

The authorization engine depends on the `authz.Store` interface:

```go
type Store interface {
    LoadResourceRegistration(ctx context.Context, resourceType, action string) (ResourceRegistrySnapshot, error)
    LoadActor(ctx context.Context, actor ActorContext) (ActorSnapshot, error)
    LoadTarget(ctx context.Context, resourceType, resourceID string) (TargetSnapshot, error)
    LoadPermissionCandidates(ctx context.Context, query CandidateQuery) ([]PermissionCandidate, error)
    WriteAuditLog(ctx context.Context, decision Decision) error
}
```

The PostgreSQL implementation lives in `internal/store/entstore` and uses Ent-generated query/mutation APIs for Core business entities. Versioned SQL migrations remain the production upgrade boundary and are applied with Atlas through `plystractl migrate up`. The only intentionally raw SQL paths are migration control-plane reads and writes around `schema_migrations`.

## Session To Actor Contract

Production applications should resolve actor context before calling Plystra:

1. Login authenticates a real User.
2. The application establishes an active Member context through a UserMember binding.
3. The request/session/token carries `user_id`, `space_id`, `member_id`, and `user_member_id`.
4. Business APIs pass that actor context to `authz.Check`.
5. Plystra returns allow/deny plus a trace.
6. Business APIs execute or reject the action.
7. Plystra writes an audit log snapshot.

The HTTP API provides opaque bearer sessions, refresh tokens, actor context, member switching, admin grants, and scoped API keys. SDKs can call Plystra with an access token from the frontend flow or with an API key for server-to-server workloads. The required authorization tuple remains explicit:

```text
user_id
space_id
member_id
user_member_id
```

## Decision Semantics

Plystra evaluates matching grants with union semantics:

- resource and action must match before scope is considered
- every matching grant is included in the trace
- the decision allows if any matching grant covers the target scope
- the decision denies if no matching grant covers the target scope

UserMember state is enforced independently from role grants. A revoked or expired UserMember binding denies authorization even when the Member still has a role that would otherwise cover the target resource.

## Audit Snapshot

`audit_logs.trace` is JSONB and stores the decision context at decision time:

- User email
- Member display name
- UserMember status and relation type
- Space
- Resource and Group
- Role and Permission candidates
- Scope checks
- Decision, deny code, and reason

Historical logs should remain explainable even after live roles, groups, permissions, or bindings change later.

## Ent And Migration Boundary

Ent is no longer deferred. In v1.0 it is the canonical Go schema model for business entities:

- `ent/schema` defines Core entities.
- generated Ent clients are used for HTTP API, auth/session, Resource Registry, plugin/template, audit, admin grant, API key, and authorization store paths.
- `migrations/` contains ordered SQL migrations with `atlas.sum` integrity checking.
- production upgrades use `plystractl migrate up`; Ent auto migration is reserved for guarded development checks.

## v1.0 Acceptance Status

| Requirement | Status |
|---|---|
| Authorization engine separated from HTTP/API and CLI | done |
| Store layer separated through `authz.Store` | done |
| Ent-backed business data access | done |
| Atlas-backed versioned migration execution | done |
| Finance Reviewer demo still runs | done |
| Audit logs are persisted and explainable | done |
| Trace output includes matched candidates and scope checks | done |
| Deny codes are machine-readable | done |
| Revoked and expired UserMember behavior is enforced | done |
| same-space protections are enforced | done |
| Admin grants and scoped API keys protect non-public APIs | done |
| Data Console and metrics are disabled by default | done |

