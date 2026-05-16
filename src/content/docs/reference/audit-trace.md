---
title: Audit Trace
description: Migrated from the Core repository and updated for the current v1.0 codebase.
---

# Audit Trace

Plystra writes audit logs for both allow and deny decisions.

Each `audit_logs.trace` value is a decision-time JSONB snapshot containing:

- actor User email and status
- active Member display name and status
- UserMember relation type, status, and expiration
- Space id and name
- target Resource, Group, owner, visibility, and metadata
- Resource Registry metadata
- every matched Role/Permission candidate
- scope anchor and scope check
- final decision, deny code, and reason
- request metadata when provided

Audit snapshots must remain explainable after live roles, bindings, groups, resources, or registry display names change later.

## Context Mode Trace Fields

When `/api/v1/authz/check` is called in Context Mode, the trace snapshots the server-supplied context instead of loading the actor, resource, and grants from Plystra tables.

The trace still has the same security shape:

- actor User, Member, binding, and Space status are evaluated
- resource type/action registry metadata is loaded from Core
- target resource `external_id`, `space_id`, `group_path`, and `owner_member_id` are captured
- inline grants are filtered to the requested resource/action
- scope anchors and scope checks are recorded
- cross-Space mismatches deny with `CROSS_SPACE_VIOLATION`
- missing or out-of-range grants deny with `NO_MATCHING_PERMISSION` or `SCOPE_OUT_OF_BOUNDS`

Inline context is accepted only from API key credentials. The audit trace should never be treated as proof that a browser supplied trustworthy actor or grant data; it proves what the trusted backend sent to Plystra for that decision.

