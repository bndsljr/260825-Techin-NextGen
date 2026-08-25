# 模块对接 · 数据接入（packages/data-ingest）

> **负责拉取并归一化外部平台数据（十一学校云平台 / ManageBac）。** 这是系统里**唯一**直接接触外部平台的模块。

---

## 1. 职责

- 对接外部数据源（云平台、ManageBac），获取课表、过程性评价、成绩。
- 解析并**归一化**为统一数据模型（见 `docs/data-model.md`）。
- 触发 `data.synced` 事件，交由 `apps/api` 落库与分发（见 `docs/events.md`）。

---

## 2. 输入（Inputs）

| 输入 | 来源 | 说明 |
|------|------|------|
| 用户授权凭证 | 用户（OAuth / token / 手动提供） | 能访问云平台 / MB 的授权 |
| `data.ingest_requested` 事件 | 客户端 / 定时调度器 | 触发一次同步，`{ source }` |
| 原始数据 | 云平台 / ManageBac | 课表、评价、成绩（格式待调研） |

---

## 3. 输出（Outputs）

| 输出 | 类型 | 去向 |
|------|------|------|
| 归一化实体 | `Course[]` `FormativeAssessment[]` `Grade[]` | → `apps/api`（落库） |
| `data.synced` 事件 | Event | → 消息总线 → 客户端/其他模块 |
| 同步报告 | `{ status, counts, errors }` | → `apps/api` → 客户端 |

---

## 4. 适配器（Adapter 规范）

每个数据源一个 adapter：`cloud`、`managebac`、`manual`。统一暴露：

```
normalize(source, raw) -> NormalizedData
  NormalizedData = { courses, assessments, grades, raw_meta }
```

- adapter 只做"解析归一化"，**不做业务决策**。
- 无法识别/冲突的数据进 `raw_meta.conflicts`，交由后端处理。

---

## 5. 对接接口（与 apps/api）

| 接口 | 方向 | 说明 |
|------|------|------|
| `POST /internal/data-ingest/:source/sync` | 外部调用 | 触发同步，返回 `sync_report` |
| `POST /internal/data-ingest/normalized` | data-ingest → api | 提交归一化结果（幂等，以外键去重） |
| `GET /internal/data-ingest/:source/status` | api → data-ingest | 查询某数据源同步状态 |

> 该内部接口仅 `apps/api` 与 `data-ingest` 之间使用，不对外暴露。

---

## 6. 事件

- 订阅：`data.ingest_requested`
- 发布：`data.synced`、`assessment.new`、`grade.new`

---

## 7. 关键约束

1. **只读外部平台**，不写回。
2. **授权优先**：不得绕过授权抓取；优先官方导出/API。
3. **敏感数据**：成绩、评价在进入任何展示或 AI 前，先脱敏（见 `docs/data-model.md`、`docs/module-ai.md`）。
4. **幂等**：重复同步不产生重复记录，靠 `source+external_id` 去重。
