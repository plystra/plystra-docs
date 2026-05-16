---
title: Release Readiness
description: Current v1.0 release scope, completed safety gates, and non-blocking deferred work.
---

Plystra Core v1.0 is scoped as a stable self-hosted Core release.

## In Scope

- Identity trace model: `User -> UserMember -> Member -> Space`.
- Authorization check and explain.
- Scope semantics for `self`, `group`, `group_tree`, and `space`.
- `global` reserved and disabled.
- Resource Registry.
- AuditLog with trace snapshots.
- Ent-managed schema model.
- Versioned PostgreSQL migrations.
- Core CRUD HTTP API.
- Auth session flow.
- Bearer session protection for non-public routes.
- Docker self-hosting baseline.
- OpenAPI v1.0 artifacts.
- Finance Reviewer demo.
- Migration, Ent drift, doctor, and smoke test gates.

## Deferred After v1.0

The current release docs treat the following as non-blocking:

- full Console as a required release surface.
- SDK repositories as required release blockers.
- plugin runtime execution.
- plugin marketplace.
- Data Console as a default production surface.
- cloud hosting.
- enterprise SSO.
- advanced policy language.

Some preview metadata routes exist for plugins, templates, and Data Console. Sensitive routes require a Bearer session with an active admin grant, and Data Console is disabled by default.

## Security Gates

Current v1.0 behavior includes:

- non-public API routes require `Authorization: Bearer <access_token>` for a user with an active admin grant.
- AuditLog and console overview are protected.
- Data Console routes return `FEATURE_DISABLED` unless enabled.
- `/metrics` returns `FEATURE_DISABLED` unless enabled.
- metrics require a metrics token or Bearer user session when enabled.
- production mode rejects wildcard CORS.
- production mode rejects default database credentials and placeholder secrets.
- User API responses and mutation audit details do not expose `password_hash`.
- authz HTTP requests ignore body-provided IP and User-Agent metadata.

## Required Verification

Run these before release:

```bash
go test ./...
PLYSTRA_DATABASE_URL="postgres://plystra:plystra@localhost:5432/plystra?sslmode=disable" go test ./...
go run ./cmd/plystractl migrate verify
go run ./cmd/plystractl ent check
go run ./cmd/plystractl doctor
docker compose config --quiet
go run ./cmd/explain-demo
```

HTTP smoke tests should cover:

- public health, ready, and version.
- unauthenticated sensitive routes return `401`.
- Bearer user session can query AuditLog and Core CRUD.
- `authz/check` allow and deny cases.
- `authz/explain` includes matched candidates and scope checks.
- Data Console and metrics are disabled by default.
- user create/detail/update/status responses omit `password_hash`.

## RC Recommendation

After the security gates above pass, the release is suitable for `v1.0.0-rc104` validation. Stable release should additionally repeat clean-clone, empty-database migration, upgrade, and documentation checks.
