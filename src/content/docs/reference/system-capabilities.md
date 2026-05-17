---
title: System Capabilities
description: Production boundaries for Plystra's trusted built-in system capability modules.
---

Plystra `1.0.0-rc121` keeps the runtime entrypoint and the official system capabilities inside the `plystra/plystra` repository. The kernel loads them as built-in privileged modules during process startup.

System capabilities are not business plugins. They are the governance layer that business plugins must pass through.

| Capability | ID | Responsibility |
|---|---|---|
| Audit | `audit.explainable` | Audit writes, audit queries, decision trace storage, and privacy-aware snapshots. |
| Identity | `identity.business` | Users, Spaces, Members, UserMembers, Groups, and actor context resolution. |
| Resource Registry | `resource.registry` | Resource type registration, action registration, resource bindings, and lookup context. |
| Authorization | `authorization.resource` | `authz/check`, `authz/explain`, deny codes, scope evaluation, and decision traces. |
| Admin | `admin.control_plane` | Admin grants, management API protection, bootstrap handoff, and admin audit events. |

## Trust Boundary

The current model is intentionally narrow.

Allowed in `1.0.0-rc121`:

- built-in modules under `internal/system/*`
- stable kernel contracts under `internal/kernel/contracts`
- manifest-declared services, routes, lifecycle hooks, and migration ownership
- startup-time loading only
- dependency ordering and readiness checks
- kernel-owned service registry, route registry, event substrate, and migration registry

Not supported in `1.0.0-rc121`:

- runtime hot unload or replacement of required system capabilities
- third-party system capabilities
- remote marketplace install for system capabilities
- business plugins replacing identity, authorization, audit, resource registry, or admin control
- Go `plugin` ABI loading
- sidecar or external-process system capability loading

## Repository Contract

`plystra/plystra` is the main release repository and contains the complete runtime:

```text
internal/kernel/
  app.go
  config/
  lifecycle/
  registry/
  contracts/
  migrations/
  events/
  bootstrap/

internal/system/
  audit/
  identity/
  resource_registry/
  authz/
  admin/
```

Kernel code depends on contract interfaces and registry metadata. It must not own the business semantics for identity, resource registry, authorization, audit, or admin control. Capability packages implement those semantics and register them through the kernel lifecycle.

## Startup Flow

At boot, `plystrad` performs the following work:

1. Load configuration and open the Ent-backed PostgreSQL connection.
2. Initialize the minimal kernel event substrate.
3. Discover the built-in system capability manifests.
4. Validate capability IDs, versions, required flags, privileges, and dependencies.
5. Resolve the dependency graph.
6. Register capability migration ownership metadata.
7. Register system services in the service registry.
8. Register API route metadata.
9. Start capability lifecycle hooks.
10. Mark `/api/v1/ready` ready only when required capabilities are healthy.

Required capabilities failing to start keep the runtime unready.

## Migrations

Database access is Ent-backed, and production schema changes are carried by versioned Atlas-style SQL migrations under `plystra/migrations/`.

Each system capability owns a migration namespace in code, while the kernel remains responsible for validating and running the release migration set:

| Capability | Namespace |
|---|---|
| `audit.explainable` | `sys_audit` |
| `identity.business` | `sys_identity` |
| `resource.registry` | `sys_resource` |
| `authorization.resource` | `sys_authz` |
| `admin.control_plane` | `sys_admin` |

Do not use Ent auto migration for production upgrades.

## Manifest Requirements

Each built-in system capability manifest must declare:

- a supported ID from the official required set
- `kind: system_capability`
- semantic version, currently `1.0.0-rc121`
- required capability dependencies
- provided services, routes, events, and migration ownership
- `privileged: true`
- `required: true`
- `stability: experimental`

## Runtime Inspection

Use readiness and capability inspection to verify the runtime:

```bash
curl -s http://localhost:8080/api/v1/ready
curl -s -H "X-Plystra-API-Key: $PLYSTRA_API_KEY" \
  http://localhost:8080/api/v1/capabilities
```

`/api/v1/ready` includes `system_capabilities`. `/api/v1/capabilities` is protected by the management authorization boundary.

## Production Checklist

- Build the main runtime from the exact source revision that will be deployed.
- Run `plystractl migrate verify` before starting production traffic.
- Run `plystractl ent check` and `plystractl doctor` in deployment validation.
- Smoke test health, readiness, version, `authz/check` allow, `authz/check` deny, and protected `/api/v1/capabilities`.
- Treat system capability code as privileged release code and review it with the same controls as kernel changes.
