---
title: Database and Migrations
description: Ent schema ownership, PostgreSQL migrations, CLI checks, and v1.0 table groups.
---

Plystra v1.0 uses Ent as the canonical Go schema model and versioned SQL migrations as the production upgrade boundary.

```text
ent/schema        -> typed Core schema model
ent/              -> generated code
migrations/       -> ordered production migration history
plystractl        -> migration, Ent drift, and doctor checks
```

## Core Rule

Production upgrades must use:

```bash
go run ./cmd/plystractl migrate up
```

Do not use Ent auto migration as the production upgrade mechanism.

## Required Checks

```bash
go run ./cmd/plystractl migrate verify
go run ./cmd/plystractl ent check
go run ./cmd/plystractl doctor
```

These checks verify migration state, Ent/database alignment, configuration, database connectivity, schema readiness, and service readiness.

## Ent Workflow for Maintainers

After editing `ent/schema`:

```bash
go generate ./ent
go test ./...
go run ./cmd/plystractl ent check
```

Commit schema changes, generated code, and migration files together.

## v1.0 Migration History

The current Core migration set includes:

| Migration | Purpose |
|---|---|
| `001_finance_demo` | Finance Reviewer seed data and baseline authorization model. |
| `002_resource_registry` | Resource types, actions, mappings, and registry metadata. |
| `003_plugin_api_preview` | Plugin metadata preview tables. |
| `004_production_readiness` | Production readiness support. |
| `005_official_plugins_and_templates` | First-party plugin/template metadata. |
| `006_data_console_mutations` | Data Console preview mutation support. |
| `007_auth_sessions` | Opaque session storage. |
| `008_restore_database_defaults` | Restored database defaults for existing schema. |
| `009_ent_v1_integration_guardrails` | Ent integration guardrails. |
| `010_v1_core_required_fields` | v1.0 required field alignment. |
| `011_ent_v1_type_alignment` | Ent type alignment. |
| `012_ent_v1_empty_database_drift_closure` | Empty database Ent drift closure. |
| `013_user_admin_grants` | User/session-backed admin grants. |
| `014_authn_hardening` | Native auth password lifecycle and login audit metadata. |

## First-class Entity Groups

| Group | Tables |
|---|---|
| Identity | `users`, `members`, `user_members`, `sessions` |
| Admin control plane | `admin_grants` |
| Tenant structure | `spaces`, `groups` |
| Authorization | `roles`, `member_roles`, `permissions`, `role_permissions` |
| Resources | `resources`, `resource_types`, `resource_actions`, `resource_mappings` |
| Audit | `audit_logs`, `audit_event_types` |
| Plugin metadata | `plugins`, `plugin_admin_menus`, `plugin_settings_definitions`, `plugin_settings_values` |
| Templates and jobs | `template_installations`, `background_jobs` |

Important relationship tables such as `user_members`, `member_roles`, and `role_permissions` are explicit entities, not hidden join tables.

## Safety Invariants

- `AuditLog` is append-only. Updates and deletes are blocked by Ent and store guardrails.
- Soft-delete style status changes are used for many management surfaces.
- `MemberRole` keeps `scope_anchor_group_id` as a first-class field.
- `RolePermission` has its own ID and metadata.
- User API responses do not expose `password_hash`.

## Upgrade Procedure

1. Back up PostgreSQL.
2. Apply migrations.
3. Verify migrations.
4. Run Ent drift check.
5. Run doctor.
6. Restart Core.
7. Smoke test operational endpoints, authz, Resource Registry, AuditLog, and request ID behavior.

Minimum commands:

```bash
go run ./cmd/plystractl migrate up
go run ./cmd/plystractl migrate verify
go run ./cmd/plystractl ent check
go run ./cmd/plystractl doctor
```
