---
title: Plugins and Capabilities
description: Current plugin metadata API, independent capability contracts, provider plugin split, and Backend OS alpha boundaries.
---

Plystra uses plugins and capabilities to grow beyond Core, but the current implementation is deliberately staged.

## Current Boundary

| Area | Current status |
|---|---|
| Plugin metadata API | Implemented preview routes in Core. |
| Plugin runtime | Not a stable hot-loaded runtime. Official sidecar/plugin repos are operated independently. |
| Capability declarations | Implemented in plugin manifests and templates. |
| Generic capability protocol | Independent `capability-contracts` repo. |
| Domain capability contracts | Independent repos, for example `email-contracts`. |
| Marketplace/cloud install | Vision, not current runtime behavior. |

Core never treats authorization, audit, identity, resource registry, or admin control as ordinary optional plugins. Those are built-in system capabilities.

## Core Plugin Metadata Routes

| Method | Path |
|---|---|
| `POST` | `/api/v1/plugins/validate-manifest` |
| `POST` | `/api/v1/plugins/install` |
| `GET` | `/api/v1/plugins` |
| `GET` | `/api/v1/plugins/{plugin_key}` |
| `POST` | `/api/v1/plugins/{plugin_key}/enable` |
| `POST` | `/api/v1/plugins/{plugin_key}/disable` |
| `POST` | `/api/v1/plugins/{plugin_key}/uninstall` |
| `GET`, `PATCH` | `/api/v1/plugins/{plugin_key}/settings` |
| `GET` | `/api/v1/plugins/{plugin_key}/resources` |
| `GET` | `/api/v1/plugins/{plugin_key}/permissions` |
| `GET` | `/api/v1/plugins/{plugin_key}/audit-events` |
| `GET` | `/api/v1/plugins/{plugin_key}/admin-menus` |

These routes validate and store metadata, expose generated resource/permission/audit/admin-menu views, and toggle lifecycle status. They do not load arbitrary third-party code into Core.

## Manifest Shape

The current manifest validates:

- reverse-DNS style plugin id, such as `plystra.moderation`.
- semantic version-like plugin version.
- `manifest_version` and `plugin_api_version`, both `1.0` for Core v1.0.
- `requires_core` version constraint.
- resource/action definitions.
- permissions with valid scopes and no `global` scope grants.
- audit event keys.
- admin menu paths under `/plugins/`.
- provided capability profiles.
- required capability profiles.

Capability IDs use dotted names such as `email.transactional`. Valid capability levels are `experimental`, `standard`, and `enterprise`.

## Independent Contract Repos

| Repository | Owns | Notes |
|---|---|---|
| `capability-contracts` | Generic capability protocol, profile/requirement validation, checksum helpers, `capserver` helper | Domain-neutral. |
| `email-contracts` | `email.transactional` contract and request validation | Domain-specific. Implementations expose `POST /contract/v1/email/send`. |

Do not put domain contracts into the generic contracts repo. Domain contracts should be extracted from real plugin/provider behavior.

## Email Provider Split

Complete Auth does not send email directly in production. It requires a provider that implements `email.transactional`.

```text
Complete Auth plugin
  -> email-contracts: POST /contract/v1/email/send
      -> SMTP provider plugin
      -> Cloudflare Email Sending provider plugin
```

| Provider | Repo | Production secret handling |
|---|---|---|
| SMTP | `plugin-email-smtp` | `EMAIL_CAPABILITY_TOKEN`, `SMTP_USERNAME`, and `SMTP_PASSWORD` are secrets. Non-sensitive SMTP host/port/TLS defaults live in `plugin_email_smtp_settings`. |
| Cloudflare Email Sending | `plugin-email-cloudflare` | `EMAIL_CAPABILITY_TOKEN` is a Cloudflare secret; Cloudflare binding config is in Worker config; sender is supplied by contract request. |

Both providers reject header injection, client-controlled transport headers, excessive recipient counts, and oversized message bodies.

## Official Metadata Seed

Core migrations seed official plugin metadata for API keys, webhooks, notifications, and moderation. That metadata demonstrates how plugins declare resources, permissions, audit events, admin menus, and settings. It does not mean those plugins are loaded into Core as arbitrary code.

## Template Capability Requirements

Templates can require plugins and capabilities. For example:

| Template | Required plugin | Required capability |
|---|---|---|
| `internal-admin` | `plystra.api_keys`, `plystra.webhooks` | `api_key.credential` standard |
| `community-lite` | `plystra.moderation` | none |
| `auth-ready-saas` | `plystra.auth_complete` | `email.transactional` standard |

Capability resolution is implemented enough for templates and metadata previews. Certified capability conformance remains future work.
