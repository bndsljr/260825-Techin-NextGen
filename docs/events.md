# 事件 / 消息契约（Event Contract）

> 模块之间通过**事件**解耦，避免硬编码依赖。事件由 `apps/api` 统一分发（消息总线），各模块订阅与发布。数据来源见 `docs/data-model.md`，对外接口见 `docs/api-contract.md`。

---

## 1. 事件信封（Envelope）

```jsonc
{
  "event": "data.synced",
  "id": "evt-uuid",
  "occurred_at": "2026-09-01T10:00:00+08:00",
  "actor": "system | user | ai",
  "payload": { }
}
```

- `actor: "ai"` 的事件受**特别约束**，见 §5。
- 事件幂等：消费方以 `id` 去重。

---

## 2. 领域事件清单

| 事件 | payload | 发布方 | 消费方 |
|------|---------|--------|--------|
| `data.ingest_requested` | `{ source }` | 客户端/调度器 | data-ingest |
| `data.synced` | `{ resource, ids[] }` | data-ingest → apps/api | 客户端、scheduler、ai |
| `schedule.updated` | `{ schedule_id, changed }` | apps/api | 客户端、scheduler、focus |
| `path.updated` | `{ path_id, changed_node_ids }` | apps/api | 客户端、ai |
| `path.node.pending` | `{ node_id }` | 用户 | 客户端 |
| `goal.proposed` | `{ node, source: "ai_suggest" }` | ai | 客户端（需用户确认） |
| `goal.accepted` | `{ node_id }` | 用户 | ai、path |
| `focus.started` | `{ session_id, slot_id }` | focus | 客户端 |
| `focus.ended` | `{ session_id, duration }` | focus | 客户端、ai |
| `assessment.new` | `{ assessment_id }` | data-ingest | 客户端、ai |
| `grade.new` | `{ grade_id }` | data-ingest | 客户端、ai |
| `mentor.requested` | `{ request_id, context }` | 客户端 | ai |
| `mentor.reply` | `{ request_id, chunk }` | ai → apps/api | 客户端 |

---

## 3. 端到端流程示例

### 3.1 课表同步到日程 + 专注
```
客户端 POST /schedule/sync
  → 事件 data.ingest_requested { source: "cloud" }
  → data-ingest 拉取+归一化 → 事件 data.synced { resource:"schedule" }
  → apps/api 落库 → 事件 schedule.updated
  → scheduler 生成/更新日历订阅
  → focus 依据 schedule.updated 计算当日专注窗口 → 事件 focus 窗口就绪
  → 客户端 WebSocket 收到 schedule.updated → 刷新
```

### 3.2 人生路径共创 + AI 辅导
```
用户选兴趣(PUT /interests)
  → path 领域模型生成 LifePath 草案
  → 用户与 AI 共创：POST /life-path/ai-propose → 事件 goal.proposed
  → 用户接受 → 事件 goal.accepted → 节点 status 变 in_progress
  → 客户端触发 POST /ai/mentor（携带 path+数据）
  → 事件 mentor.requested → ai 生成 → 事件 mentor.reply → 客户端流式展示
```

---

## 4. 消费与重试

- 失败事件进入 `retry queue`，**指数退避**重试（1s/5s/30s…）。
- 消费方应**幂等**：同一事件重复处理不产生副作用。
- 死信超过 N 次进 `dead-letter`，人工排查。

---

## 5. AI 事件约束（辅助不越位）

- **禁止**：`ai` 直接发布任何**改变决策状态**的事件（如直接把 `path.node` 改为 `achieved`）。
- **允许**：只发布 `goal.proposed`（建议稿），必须等用户 `goal.accepted` 后才落地。
- 任何由 `ai` 触发的事件，`actor` 标记为 `ai`，后端把它视为"建议"，不自动执行副作用。
