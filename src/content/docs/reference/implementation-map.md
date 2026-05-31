---
title: Implementation Map
description: Current implemented Plystra surfaces, repositories, maturity labels, and where to find usage docs.
---

This page maps what exists today in the workspace. It separates implemented stable behavior from preview surfaces and long-term Backend OS vision.

## Stability Legend

| Label | Meaning |
|---|---|
| Stable | Implemented behavior intended for the current self-hosted Core release line. |
| Preview | Implemented metadata, feature-flagged, or alpha behavior that may still change. |
| Vision | Product direction from `product-spec.en.md` and phase PRDs. Not a current runtime promise. |

## Repository Boundaries

| Repository | Status | Owns |
|---|---|---|
| `plystra/plystra` | Stable Core plus preview extension metadata | HTTP API, native minimal auth, actor context, API keys, authorization engine, Resource Registry, AuditLog, migrations, system capabilities, template scaffold CLI, generated OpenAPI. |
| `plystra/plystra-docs` | Stable docs site | English and Chinese documentation, OpenAPI downloads, production/operator guides. |
| `plystra/js-sdk` | Stable SDK surface | TypeScript/JavaScript client for stable Core HTTP surfaces. |
| `plystra/python-sdk` | Stable SDK surface | Sync and async Python clients for stable Core HTTP surfaces. |
| `plystra/go-plystra` | Stable SDK surface | Go client for stable Core HTTP surfaces. |
| `plystra/plugin-auth-complete` | Independent plugin | Public registration, password login, refresh/logout, email verification codes, magic links, plugin-owned auth settings and challenge state. |
| `plystra/email-contracts` | Independent domain contract | `email.transactional` capability contract and `POST /contract/v1/email/send` request validation. |
| `plystra/plugin-email-smtp` | Independent provider plugin | SMTP implementation of `email.transactional`; non-sensitive SMTP settings in DB, credentials in secrets/env. |
| `plystra/plugin-email-cloudflare` | Independent provider plugin | Cloudflare Email Sending Worker implementation of `email.transactional`; bearer token in Cloudflare secrets. |
| `plystra/capability-contracts` | Independent protocol contract | Generic `/contract/v1/capability/*` protocol, capability profile validation, and process-backed capability helpers. Product/domain contracts are separate repos. |

## Current Stable Core

| Capability | Runtime surface | Docs |
|---|---|---|
| Minimal native auth | `/api/v1/auth/register`, `/login`, `/refresh`, `/logout`; registration off by default | [HTTP API](/guides/http-api/), [Admin Auth and Security](/reference/admin-auth-and-security/) |
| Actor context | `/api/v1/actor/context`, `/api/v1/actor/switch-member` | [Identity and Scope](/concepts/identity-and-scope/) |
| Admin grants | `/api/v1/admin/*` with instance, Space, and Group scopes | [Admin Auth and Security](/reference/admin-auth-and-security/) |
| API keys | `/api/v1/api-keys`, scoped server-to-server auth, HMAC stored keys | [API Keys and Admin Grants](/guides/developer-handbook/api-keys-and-admin-grants/) |
| Authorization engine | `/api/v1/authz/check`, `/api/v1/authz/explain` | [Authorization Model](/guides/developer-handbook/authorization-model/) |
| Context Mode | Trusted inline actor/resource/grants through API key calls | [Integrate Your App](/guides/integrate-your-app/) |
| Resource Registry | resource types, actions, mappings, resources | [Resource Registry](/reference/resource-registry/) |
| Audit trace | append-only authorization and mutation audit logs | [Audit Trace](/reference/audit-trace/) |
| System capabilities | `audit.explainable`, `identity.business`, `resource.registry`, `authorization.resource`, `admin.control_plane` | [System Capabilities](/reference/system-capabilities/) |
| Migrations and schema | PostgreSQL, Ent schema, versioned Atlas-style migrations | [Database and Migrations](/reference/database-and-migrations/) |
| Production guardrails | production startup validation, secret rotation, CORS, timeouts | [Configuration](/reference/configuration/), [Self-hosting](/guides/self-hosting/) |
| OpenAPI | generated JSON/YAML downloads | [OpenAPI](/reference/openapi/) |
| SDKs | JS, Python, Go clients for stable Core HTTP surface | [SDKs](/guides/sdks/) |

## Current Preview And Alpha Surfaces

| Surface | Current behavior | Boundary |
|---|---|---|
| Plugin metadata API | Manifest validation, metadata install, lifecycle flags, settings, resources, permissions, audit events, admin menus | Not stable hot-loaded plugin runtime or marketplace. |
| Capability declarations | Plugin manifests can declare provided and required capabilities. Templates can require capabilities. | Certification/conformance is not complete. Domain contracts should come from real plugins. |
| Template metadata API | Lists built-in template manifests and supports preview/install metadata records | The inspectable Backend OS Alpha scaffold path is `plystractl templates create`. |
| Backend OS Alpha scaffolds | `blank`, `internal-admin`, `community-lite`, and `auth-ready-saas` templates generate inspectable app directories | Cloud hosting and marketplace behavior are out of scope. |
| Data Console | `/api/v1/data/*` feature-flagged routes for internal-table mapped resources | Disabled by default and not a stable production data platform. |
| Complete Auth plugin | Independent plugin for full auth flows | Separate repo; Core remains minimal. Email delivery requires email contracts plus a provider plugin. |
| Email providers | SMTP and Cloudflare implementations of `email.transactional` | Separate repos and independently deployed services. |

## Vision Only

These are product direction, not current production guarantees:

- cloud hosting.
- public plugin marketplace.
- third-party plugin sandboxing.
- full action gateway runtime.
- full capability certification program.
- hosted billing, CMS, storage, and other broad business capability families.

Plystra's current reliable product promise is: start by protecting one existing backend action with an explainable, self-hosted authorization and audit core; then grow into governed resources, plugins, capabilities, and templates only when needed.
