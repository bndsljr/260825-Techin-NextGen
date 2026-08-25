# 后端统一 API 契约（API Contract）

> **客户端（Web / iOS）与前后端对接的唯一基准。** 所有请求走 `apps/api`，采用 **REST + JSON**，实时部分用 **WebSocket**。字段与数据结构以 `docs/data-model.md` 为准。

---

## 1. 基本约定

- Base URL：`https://api.bnds.example.com/api/v1`
- 内容类型：`Content-Type: application/json`
- 认证：`Authorization: Bearer <token>`（JWT，短时效 access + 长时效 refresh）
- 响应包裹：

```jsonc
{ "data": { ... }, "error": null }
```

出错时：

```jsonc
{ "data": null, "error": { "code": "NOT_FOUND", "message": "…" } }
```

分页统一：`?page=1&page_size=20`，响应 `{ "data": [...], "pagination": { "total": 100, "page": 1 } }`。

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 400 | 请求错误 |
| 401 | 未认证 / token 失效 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 冲突 |
| 429 | 频率限制 |
| 500 | 服务器错误 |

---

## 2. 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/auth/login` | 登录（学校账号 / 第三方），返回 `access_token`, `refresh_token`, `user` |
| `POST` | `/auth/refresh` | 刷新 access token |
| `POST` | `/auth/logout` | 登出并失效 refresh token |
| `GET`  | `/auth/me` | 当前用户信息 |

---

## 3. 兴趣 / 人生路径

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET`  | `/interests` | 可选兴趣板块列表 |
| `PUT`  | `/interests` | 更新用户已选兴趣 `{ interests: [...] }` |
| `GET`  | `/life-path` | 获取当前人生路径 |
| `PUT`  | `/life-path` | 更新人生路径（title/结构） |
| `POST` | `/life-path/nodes` | 新增节点（`source` 默认 `user`） |
| `PATCH`| `/life-path/nodes/:id` | 更新节点（**status 只能由用户操作**；见注） |
| `DELETE`| `/life-path/nodes/:id` | 删除节点 |
| `POST` | `/life-path/ai-propose` | 请求 AI 生成"路径建议稿"（**返回建议，不落地**） |
| `POST` | `/life-path/ai-propose/accept` | 用户确认采纳某条建议 → 转为 `user` 节点 |

> 🚫 **约束**：`/life-path/nodes/:id` 的 `status` 变更必须带有 `actor: "user"`；若要 AI 改动，先走 `ai-propose` 再 `accept`。**后端禁止 AI 直接改 path**。

### 路径示例请求
```jsonc
PUT /life-path
{
  "title": "我的高中三年",
  "nodes": [
    { "type": "vision", "title": "成为能解决真实问题的工程师", "status": "pending" },
    { "type": "long_term_goal", "title": "高三前完成一个 AI 项目", "status": "in_progress" }
  ]
}
```

---

## 4. 课表 / 日程 / 日历

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET`  | `/schedule` | 合并后的统一课表 `Course[]` |
| `POST` | `/schedule/sync` | 触发一次数据同步（拉取云平台/MB） |
| `GET`  | `/schedule/calendar.ics` | 生成/导出 iCal 订阅 | 或
| `POST` | `/schedule/calendar/revoke` | 撤销日历订阅 |
| `GET`  | `/schedule/slots?from=&to=` | 指定时间段内的 `ScheduleSlot[]` |
| `GET`  | `/calendar/subscribe-url` | 返回系统日历订阅链接（CalDAV/ICS） |

---

## 5. 评价 / 成绩

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/assessments` | 过程性评价列表（可按课程/维度筛选） |
| `GET` | `/grades` | 成绩列表 |
| `GET` | `/grades/summary` | 成绩汇总（平均/趋势），供 AI 与展示 |

---

## 6. 专注模式

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET`  | `/focus/windows?date=` | 当天应专注的时段 `ScheduleSlot[kind=focus]` |
| `POST` | `/focus/sessions` | 开启一个专注会话 |
| `PATCH`| `/focus/sessions/:id` | 结束/中止会话 |
| `GET`  | `/focus/sessions?from=&to=` | 专注历史与统计 |

---

## 7. AI 个性化辅导

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/ai/mentor` | 发起一次辅导：后端聚合 path+评价+成绩 → 交给 `packages/ai` → 返回建议 |
| `POST` | `/ai/mentor/stream` | SSE 流式返回分点建议 |
| `GET`  | `/ai/mentor/history` | 历史辅导记录 |

`/ai/mentor` 请求：
```jsonc
POST /ai/mentor
{
  "context": {
    "path_id": "uuid",
    "focus": "exam | planning | study_habit",
    "include": ["assessments", "grades", "recent_slots"]
  }
}
```
响应：
```jsonc
{
  "data": {
    "summary": "…",
    "suggestions": [
      { "id": "…", "text": "可以试试…", "reason": "因为…", "source": "ai_suggest" }
    ],
    "open_questions": ["你想优先攻克哪个科目？"],
    "decision_required": false   // 始终 false 或建议项；真正的决定由用户做
  }
}
```

> 📌 AI 返回的是**建议与选项**，`decision_required` 永远不代表"由 AI 决定"。客户端必须展示给用户确认。

---

## 8. WebSocket（实时）

`wss://api.bnds.example.com/ws?token=…`

| 事件 | 方向 | 说明 |
|------|------|------|
| `data.synced` | server→client | 课表/评价/成绩更新，携带 `resource`, `ids` |
| `schedule.updated` | server→client | 课表变更 |
| `focus.started` / `focus.ended` | server→client | 专注会话状态 |
| `mentor.reply` | server→client | AI 流式建议片段 |
| `client.action` | client→server | 用户在客户端做出的决策（用于记录与同步） |

客户端收到 `data.synced` 后，按需拉取对应资源并刷新。

---

## 9. 版本与错误

- 版本加在路径：`/api/v1`，破坏性变更升 `/api/v2`。
- 所有端在首屏拉取 `/auth/me` + 必要初始数据（课表/路径/兴趣）。
- 频率限制对未认证请求更严格，前端需处理 `429`。
