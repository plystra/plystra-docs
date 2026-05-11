---
title: Ent Database Management
description: Migrated from the Core repository and updated for the current v1.0 codebase.
---

# Ent Database Management

Plystra now uses Ent as the canonical Go schema model for Core database objects.

The SQL files in `migrations/` remain the ordered, checksum-verified migration history. Atlas executes those migrations and verifies the `migrations/atlas.sum` integrity file. Ent is used for:

- type-safe schema definitions in `ent/schema`
- generated entity builders and query APIs in `ent`
- guarded, non-destructive schema apply checks through `plystractl ent apply`
- schema presence checks through `plystractl ent status`

This split keeps production upgrades auditable while keeping business data access on Ent. Raw SQL is limited to migration metadata and Atlas migration execution.

## Commands

Regenerate Ent code after editing `ent/schema`:

```powershell
go run entgo.io/ent/cmd/ent generate ./ent/schema
```

Check that Ent-managed tables are present:

```powershell
go run .\cmd\plystractl ent status
```

Apply the Ent schema without dropping existing columns or indexes:

```powershell
go run .\cmd\plystractl ent apply
```

Apply production migrations through Atlas:

```powershell
go run .\cmd\plystractl migrate up
go run .\cmd\plystractl migrate verify
```

## Modeling Notes

- All first-class tables use Plystra's existing text IDs.
- `role_permissions` is modeled as a first-class Ent schema with its own `id`, preserving the v1.0 requirement that important relationship tables stay explicit.
- JSON/JSONB columns are modeled as Ent JSON fields.
- Core business repositories use Ent. Keep raw SQL out of business handlers unless it is migration metadata or an explicitly documented control-plane exception.

