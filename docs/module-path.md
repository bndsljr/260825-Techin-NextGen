# 模块对接 · 人生路径（packages/path）

> **产品灵魂。** 管理"兴趣板块 → 人生路径 → 短期/长期目标"这一核心领域模型。所有 AI 辅导都以这里的路径为主轴。

---

## 1. 职责

- 维护 `LifePath` 及其节点 `LifePathNode[]`（兴趣、愿景、长期目标、短期目标、任务）。
- 管理节点状态：`in_progress / achieved / pending / abandoned`。
- 处理 AI 的"建议稿"，并由用户决定是否落地。
- 向 AI 模块提供路径上下文。

---

## 2. 领域规则（关键）

1. **用户主导**：路径结构的增删、状态流转，**只能由用户发起**。
2. **处处可待定**：任意节点可处于 `pending`（待定），不强制补全。
3. **AI 只建议**：
   - AI 产出的候选节点/目标默认 `source: "ai_suggest"`；
   - 必须经用户 `goal.accepted` 后才转为 `user` 节点落地；
   - **AI 永不直接**改变已有节点 `status`。
4. **可推翻**：任何节点可回到 `pending` 或 `abandoned`，AI 不得阻止。

---

## 3. 输入 / 输出

| 方向 | 内容 | 说明 |
|------|------|------|
| 输入 | Onboarding 兴趣/人生想法 | 来自用户 |
| 输入 | AI 建议稿 `goal.proposed` | 来自 `packages/ai` |
| 输入 | 用户确认 `goal.accepted` | 来自用户 |
| 输出 | `LifePath` / `LifePathNode[]` | 供客户端展示、AI 上下文 |
| 输出 | `path.updated` 事件 | 通知客户端、AI 刷新 |

---

## 4. 对外接口（apps/api 提供）

| 接口 | 说明 |
|------|------|
| `PUT /life-path` | 整体保存路径 |
| `POST /life-path/nodes` | 新增节点（默认 `user`） |
| `PATCH /life-path/nodes/:id` | 更新节点（状态变更须 `actor=user`） |
| `DELETE /life-path/nodes/:id` | 删除节点 |
| `POST /life-path/ai-propose` | 请求 AI 路径/目标建议稿（**不改数据**） |
| `POST /life-path/nodes/:id/accept` | 用户采纳某条建议 → 落地为 `user` 节点 |

---

## 5. 事件

- 订阅：`goal.proposed`（来自 ai）、`goal.accepted`
- 发布：`path.updated`、`path.node.pending`

---

## 6. Onboarding 共创流程

1. 用户选兴趣（`interests`）+ 写人生想法。
2. `path` 生成 `LifePath` 初始框架（含待定占位）。
3. AI 基于兴趣/想法给出草案（`ai-propose`），用户增删/排序。
4. 用户对不满意的节点可标 `pending`。
5. 所有"待定"均被平台尊重，AI 不催促补全。
