# 系统架构与模块边界

> 本文档是 6 人并行开发的**总览**，定义系统分层、模块职责与"谁和谁对接"。所有模块的对接都遵循这里的原则。

---

## 1. 总体架构

```
                    ┌──────────────────────────────────────────┐
                    │              客户端 (Client)               │
                    │   Web (apps/web)   ·   iOS (apps/ios)     │
                    │   Dashboard · 日程 · 专注 · AI 对话 · Onboarding │
                    └─────────────────────┬────────────────────┘
                                          │  REST / WebSocket
                                          ▼
                    ┌──────────────────────────────────────────┐
                    │        后端统一服务 (apps/api)              │
                    │   认证 · 数据 · 日程 · 专注 · 路径 · AI 编排   │
                    └──────┬───────────────┬───────────────┬────┘
                           │               │               │
               ┌───────────▼───────┐ ┌────▼─────────┐ ┌────▼─────────┐
               │  packages/*       │ │  数据层/存储    │ │  外部平台      │
               │  领域逻辑          │ │  (DB/缓存)     │ │  云平台/MB    │
               └───────────────────┘ └──────────────┘ └──────────────┘
```

**核心思想**：所有业务逻辑收敛到后端 `apps/api`，前端/iOS 只消费 API；各 `packages` 是实现细节，被 `apps/api` 组装；外部平台数据只经由 `data-ingest` 进入。

---

## 2. 模块清单与职责

| 模块 | 职责 | 主要对接方 |
|------|------|-----------|
| `apps/web` | 前端 Web 界面 | 只对接 `apps/api` 的 REST/WS |
| `apps/ios` | iOS 客户端 | 只对接 `apps/api` 的 REST/WS |
| `apps/api` | 统一后端，权限/编排/聚合 | 对接所有客户端 + 各 packages + 存储 |
| `packages/data-ingest` | 拉取并归一化云平台/MB 数据 | 外部平台 → `apps/api` |
| `packages/scheduler` | 课表解析 · 日历同步(ICS/CalDAV) | `apps/api` → 系统日历 |
| `packages/focus` | 根据课表生成专注时段/会话 | `apps/api`、客户端 |
| `packages/path` | 人生路径领域模型(兴趣/目标/节点) | 客户端、AI 模块 |
| `packages/ai` | LLM/RAG/Prompt 编排，生成建议 | `apps/api`、`path`、数据 |
| `packages/contracts` | 共享数据模型与类型(唯一权威) | 所有模块 |

---

## 3. 对接关系总览

```
外部平台(云平台/ManageBac)
        │  (a) 授权数据
        ▼
 data-ingest ──(b) 归一化结果──▶ apps/api ──(c) 存储 ──▶ 数据库
        ▲                              │
        │                              │ (d) 对外 API
        │                              ▼
        │                     Web 客户端  ·  iOS 客户端
        │                              │
        │                              │ (e) 触发 AI 分析(携带 path+数据)
        │                              ▼
        └──────── path ◀── apps/api ◀── ai ──(f) 建议 ──▶ 客户端
```

| 对接 | 描述 | 文档 |
|------|------|------|
| (a) 数据接入 | 云平台/MB → data-ingest（授权/解析/归一化） | `module-data-ingest.md` |
| (b) 归一化结果 | data-ingest → apps/api（写入统一模型） | `module-data-ingest.md` |
| (c) 数据落库 | apps/api → 存储 | `data-model.md` |
| (d) 对外 API | 客户端 ↔ apps/api（REST/WS） | `api-contract.md` |
| (e) AI 触发 | 客户端/系统 → ai（携带 path+评价+成绩） | `module-ai.md` |
| (f) 建议返回 | ai → 客户端（**辅助不越位**） | `module-ai.md` |

---

## 4. 架构约束（所有组必须遵守）

1. **单一数据源**：数据模型只以 `packages/contracts` + `docs/data-model.md` 为权威定义，各端点不得自行定义重复结构。
2. **客户端零耦合**：`apps/web` 与 `apps/ios` 只能通过 `apps/api` 的 REST/WS 交互，**禁止**直接访问数据库或外部平台。
3. **AI 边界不可越位**：`packages/ai` 只输出"分析/建议/选项"，**永不**直接改动 `path`/`goal` 状态，决策动作必须由用户发起。
4. **对外解耦**：`data-ingest` 是唯一能接触外部平台的地方，其余模块不得反向抓取。
5. **事件驱动解耦**：模块间通过 `docs/events.md` 定义的事件解耦，避免硬编码依赖。

---

## 5. 分层与依赖方向

```
前端/客户端  ──▶  apps/api  ──▶  data-ingest / scheduler / focus / path / ai
                    │
                    └──▶  storage / 外部日历
```

依赖只能自上而下，禁止反向依赖（如 `ai` 不允许依赖 `web`）。各 `packages` **互不直接依赖**，统一由 `apps/api` 组装（若确需依赖，通过 `contracts` 的类型与事件解耦）。
