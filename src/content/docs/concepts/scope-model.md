---
title: Scope Model
description: Plystra v1.0 permission scope semantics.
---

Permission grants combine `resource`, `action`, and `scope`. Role assignments can include `scope_anchor_group_id` when the scope needs a group anchor.

## v1.0 Scopes

| Scope | Rule | Result |
|---|---|---|
| `self` | `resource.owner_member_id == actor.member_id` | allowed only for resources owned by the active Member |
| `group` | `resource.group_id == scope_anchor_group_id` | allowed only for the exact anchor Group |
| `group_tree` | target path equals anchor path or starts with `anchor_path + "."` | allowed for the anchor Group and descendants |
| `space` | `resource.space_id == actor.space_id` | allowed inside the active Space |
| `global` | disabled for normal Members | always denies with `GLOBAL_SCOPE_DISABLED` |

The `group_tree` rule is intentionally strict:

```text
target_path = anchor_path OR target_path LIKE anchor_path || '.%'
```

This avoids matching unrelated paths such as `finance-old`.

`global` is reserved for future system-level semantics and always denies for ordinary authorization checks in the current release.

