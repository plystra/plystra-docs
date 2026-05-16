---
title: System Capabilities
description: Production boundaries for Plystra's trusted startup-time system capability modules.
---

Plystra `1.0.0-rc104` keeps the runtime entrypoint in the `plystra/plystra` repository and loads official system capabilities as trusted local sidecars at startup.

System capabilities are privileged runtime modules, not business plugins. They provide the governance layer that business plugins must later pass through.

| Capability | ID | Responsibility |
|---|---|---|
| Audit | `audit.explainable` | Audit writes, audit queries, decision trace storage, and privacy-aware snapshots. |
| Identity | `identity.business` | Users, Spaces, Members, UserMembers, Groups, and actor context resolution. |
| Resource Registry | `resource.registry` | Resource type registration, action registration, resource bindings, and lookup context. |
| Authorization | `authorization.resource` | `authz/check`, `authz/explain`, deny codes, scope evaluation, and decision traces. |
| Admin | `admin.control_plane` | Admin grants, management API protection, bootstrap handoff, and admin audit events. |

## Trust Boundary

The current system capability model is intentionally narrow.

Allowed in `1.0.0-rc104`:

- independent repositories and versions
- independent `capability.yaml` manifests
- independent Atlas-style migration bundles
- local sidecar processes started by `plystra/plystra`
- startup-time loading only
- manifest validation, dependency ordering, lockfile pinning, and binary checksum verification
- Kernel-to-capability calls through `github.com/plystra/contracts`

Not supported in `1.0.0-rc104`:

- runtime hot unload or replacement of required system capabilities
- third-party system capabilities
- remote marketplace install for system capabilities
- business plugins replacing identity, authorization, audit, resource registry, or admin control
- Go `plugin` ABI loading
- WASM or container marketplace execution for core governance modules

## Repository Contract

`github.com/plystra/contracts` owns shared capability types, lifecycle payloads, route and service registration structures, lockfile structures, and domain contract types.

System capability repositories depend on `contracts`; they must not import `plystra/plystra` implementation code. The main runtime repo depends on `contracts` and starts capabilities by reading manifests and pinned local binaries.

`system-authz` is the authorization implementation repository. The public capability ID remains `authorization.resource`.

## Startup Flow

At boot, `plystra/plystra` performs the following work:

1. Load `capabilities/system-capabilities.yaml` or `PLYSTRA_SYSTEM_CAPABILITIES_CONFIG`.
2. Load or create `capabilities/plystra.lock` or `PLYSTRA_LOCKFILE`.
3. Parse and validate each `capability.yaml`.
4. Verify each configured binary against the lockfile checksum.
5. Resolve the dependency graph in required system order.
6. Apply each capability migration bundle and record checksums in `kernel_capability_migrations`.
7. Start each sidecar process.
8. Call lifecycle endpoints for health, describe, prepare, and start.
9. Register services and routes.
10. Mark `/api/v1/ready` ready only when all required capabilities are ready.

Required capabilities failing to start keep the runtime unready.

## Local Build

Build official sidecars from the main runtime repository:

Linux and macOS:

```bash
cd ~/src/plystra/plystra
./scripts/build-capabilities.sh
```

Windows PowerShell:

```powershell
cd C:\Users\i\Documents\GitHub\plystra\plystra
.\scripts\build-capabilities.ps1
```

The scripts copy manifests and migrations into `plystra/capabilities/`, build local binaries from the five `system-*` repositories, and remove the existing lockfile so the next boot pins fresh checksums.

## Configuration

Default file:

```yaml
system_capabilities:
  - id: audit.explainable
    source: local
    binary: ./system-audit/system-audit
    manifest: ./system-audit/capability.yaml
    required: true
  - id: identity.business
    source: local
    binary: ./system-identity/system-identity
    manifest: ./system-identity/capability.yaml
    required: true
  - id: resource.registry
    source: local
    binary: ./system-resource-registry/system-resource-registry
    manifest: ./system-resource-registry/capability.yaml
    required: true
  - id: authorization.resource
    source: local
    binary: ./system-authz/system-authz
    manifest: ./system-authz/capability.yaml
    required: true
  - id: admin.control_plane
    source: local
    binary: ./system-admin/system-admin
    manifest: ./system-admin/capability.yaml
    required: true
```

On Linux and macOS, binaries are resolved without an extension. On Windows, the runtime also resolves `.exe` binaries automatically.

Use `PLYSTRA_SYSTEM_CAPABILITIES_CONFIG` for an explicit config path and `PLYSTRA_LOCKFILE` for an explicit lockfile path.

## Manifest Requirements

Each official system capability manifest must declare:

- a supported ID from the official required set
- `kind: system_capability`
- semantic version, currently `1.0.0-rc104`
- process runtime with HTTP protocol and address
- kernel compatibility
- required capability dependencies
- provided services, routes, migrations, and migration namespace
- `privileged: true`
- `required: true`
- `stability: experimental`

Each capability owns only its migration namespace:

| Capability | Namespace |
|---|---|
| `audit.explainable` | `sys_audit` |
| `identity.business` | `sys_identity` |
| `resource.registry` | `sys_resource` |
| `authorization.resource` | `sys_authz` |
| `admin.control_plane` | `sys_admin` |

## Runtime Inspection

Use readiness and capability inspection to verify the runtime:

```bash
curl -s http://localhost:8080/api/v1/ready
curl -s -H "X-Plystra-API-Key: $PLYSTRA_API_KEY" \
  http://localhost:8080/api/v1/capabilities
```

`/api/v1/ready` includes `system_capabilities`. `/api/v1/capabilities` is protected by the management authorization boundary.

## Production Checklist

- Build sidecars from the exact source revision that will be deployed.
- Keep `plystra.lock` with the deployed artifact set.
- Do not edit locked checksums manually.
- Run `plystractl migrate verify` before starting production traffic.
- Smoke test health, readiness, version, `authz/check` allow, `authz/check` deny, and protected `/api/v1/capabilities`.
- Treat capability binaries as trusted deployment artifacts and distribute them through the same release controls as the main runtime.
