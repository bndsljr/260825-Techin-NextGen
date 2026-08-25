# 模块对接 · AI 大模型（packages/ai）

> **负责 LLM 接入、Prompt 编排、RAG（基于个人数据）与个性化辅导。** 输出永远只是"分析与建议"，**绝不替用户做决定**。

---

## 1. 职责

- 接入大模型（可插拔 provider，便于替换/多模型）。
- 聚合上下文：人生路径 + 过程性评价 + 成绩 + 近期日程。
- 生成个性化分析、学习建议、策略与提醒。
- 提供交流入口（AI 对话；可选邮件/群等渠道）。

---

## 2. 输入 / 输出

| 方向 | 内容 | 说明 |
|------|------|------|
| 输入 | `LifePath`（主轴） | 来自 `packages/path` |
| 输入 | `FormativeAssessment[]` / `Grade[]`（脱敏后） | 来自 `apps/api` 数据层 |
| 输入 | `ScheduleSlot[]`（近期日程） | 来自 `scheduler` |
| 输入 | 用户问题/情境 `{ focus }` | 来自客户端 `POST /ai/coach` |
| 输出 | `{ summary, suggestions[], open_questions[], decision_required:false }` | → 客户端 |

---

## 3. Prompt 编排原则

- **以人生路径为主轴**：回答必须把"建议"锚定到用户的长期/短期目标。
- **给选项与利弊**：鼓励用户权衡，而不是替用户选。
- **标明依据**：每条建议附 `reason`，让用户能判断与质疑。
- **允许未知/待定**：用户路径上有 `pending` 时，AI 不强推、不越界。

### 三段式 Prompt
1. **System**：定位为"个人成长参谋"，明确"决策权在人"。
2. **Context（RAG）**：注入路径 + 数据摘要 + 近期日程。
3. **User**：用户的具体问题/关注点。

---

## 4. 对外接口（apps/api 提供）

| 接口 | 说明 |
|------|------|
| `POST /ai/coach` | 一次性返回建议 |
| `POST /ai/coach/stream` | SSE 流式返回分点建议 |
| `GET /ai/coach/history` | 历史记录 |

---

## 5. RAG 与脱敏

- **脱敏优先**：进入模型前，去掉可直连个人身份的字段（姓名、学号等），用脱敏标识替换。
- **数据最小化**：只注入"回答问题所必需"的部分，避免整库透传。
- **上下文构建**：把 `path + 近期评价摘要 + 成绩趋势 + 近期日程` 压缩为结构化摘要后再送入模型。

---

## 6. 事件与约束

- 订阅：`coach.requested`、`goal.accepted`、`assessment.new`、`grade.new`、`path.updated`
- 发布：`goal.proposed`（**建议稿**，必须用户确认）、`coach.reply`

### 🚫 红线（辅助不越位）
- AI **不得**直接修改 `LifePath`/`LifePathNode` 的 `status`。
- AI 只发布 `goal.proposed`（建议），**用户 `goal.accepted` 后**才落地。
- 当用户目标与 AI"最优解"冲突时，**以用户为准**；AI 不得说服/施压。
- 所有 AI 事件 `actor: "ai"`，后端视为"建议"，不自动执行副作用。

---

## 7. 可插拔 Provider

| 配置项 | 说明 |
|--------|------|
| `provider` | `deepseek | openai | ...`（可多 provider 路由） |
| `model` | 具体模型 |
| `context_limit` | 上下文上限，控制注入量 |
| `rate_limit` | 频率限制，防止成本失控 |

> 模型提供商/模型选择属于开放决策，见 README「待确认决策」。
