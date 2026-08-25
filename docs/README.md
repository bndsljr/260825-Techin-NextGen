# 技术文档索引

本目录沉淀各模块的**对接文档**，6 人并行开发的协作基准。建议阅读顺序：

## 必读（所有成员）
| 文档 | 内容 |
|------|------|
| [architecture.md](./architecture.md) | 系统架构、模块职责、依赖方向、对接关系总览 |
| [data-model.md](./data-model.md) | 🔑 统一数据模型（字段、枚举、JSON 示例）—— 对接基石 |
| [api-contract.md](./api-contract.md) | 后端统一 API 契约（REST + WebSocket）—— 客户端基准 |
| [events.md](./events.md) | 模块间事件/消息契约（解耦与流程） |
| [ux-ia.md](./ux-ia.md) | 🎨 界面信息架构与层级规范（iOS 3-Tab / Web 侧栏）—— 设计基准 |

## 各模块（按分工阅读）
| 文档 | 对应模块 | 主要负责 |
|------|----------|----------|
| [module-data-ingest.md](./module-data-ingest.md) | `packages/data-ingest` | 平台信息对接（云平台 / ManageBac） |
| [module-scheduler.md](./module-scheduler.md) | `packages/scheduler` | 课表 → 日历同步 |
| [module-focus.md](./module-focus.md) | `packages/focus` | 专注模式 |
| [module-path.md](./module-path.md) | `packages/path` | 人生路径领域模型 |
| [module-ai.md](./module-ai.md) | `packages/ai` | AI 大模型接入（辅助不越位） |

## 角色分工导览
- **iOS 端**：读 `api-contract.md` + `ux-ia.md`（+ `data-model.md`），对接 `apps/api`。
- **Web 端**：读 `api-contract.md` + `ux-ia.md`（+ `data-model.md`），对接 `apps/api`。
- **平台信息对接**：读 `module-data-ingest.md`。
- **AI 大模型**：读 `module-ai.md` + `module-path.md` + `events.md`。

---

> 文档约定：本文档与代码共同演进；数据模型变更先改 `data-model.md`，再同步 API 与各端。如发现不一致，请以 `packages/contracts` + `docs/data-model.md` 为准并提 PR。
