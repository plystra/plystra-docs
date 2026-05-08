---
title: 作用域模型
description: Plystra v1.0 的 permission scope 语义。
---

Permission 由 `resource`、`action` 和 `scope` 组成。角色授权时可以带 `scope_anchor_group_id` 作为锚点。

## v1.0 scope

- `self`：资源 owner 是当前 actor member。
- `group`：资源所在 group 等于授权锚点。
- `group_tree`：资源所在 group 是锚点或锚点的子树。
- `space`：资源在同一个 Space 内。
- `global`：保留字段，v1.0 禁用。

`group_tree` 使用安全前缀规则：

```text
target_path = anchor_path OR target_path starts with anchor_path + "."
```
