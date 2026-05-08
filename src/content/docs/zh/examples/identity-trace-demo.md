---
title: 身份 Trace Demo
description: Finance Reviewer demo 的四个授权案例。
---

`cmd/explain-demo` 会输出 v1.0 需要证明的四个核心案例。

```powershell
go run .\cmd\explain-demo
```

## 案例

| 案例 | Actor | Target | Decision | 证明点 |
|---|---|---|---|---|
| 1 | Alice via Finance Reviewer | Finance/APAC invoice | `allow` | `group_tree` 覆盖子组 |
| 2 | Alice via Finance Reviewer | Legal/EMEA invoice | `deny` | 作用域越界会被拒绝 |
| 3 | Bob via Finance Reviewer | Finance/APAC invoice | `allow` | 多个 User 可使用同一个 Member |
| 4 | Alice via revoked binding | Finance/APAC invoice | `deny` | revoked UserMember 不能授权 |

这个 demo 是判断 Core 是否贴合 PRD 的最小语义证明。
