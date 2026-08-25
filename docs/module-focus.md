# 模块对接 · 专注模式（packages/focus）

> **基于课表决定"何时专注"，并管理一段段专注会话。**

---

## 1. 职责

- 读取课表时段，计算当天/本周应专注的时间窗。
- 创建并管理 `FocusSession`，记录开始/结束时长。
- 阻塞期间触发客户端"屏蔽干扰"（能力由客户端实现，本模块只提供决策与状态）。

---

## 2. 输入 / 输出

| 方向 | 内容 | 说明 |
|------|------|------|
| 输入 | `ScheduleSlot[]` | 来自 `scheduler` / `apps/api` |
| 输入 | 用户偏好 `{ min_focus_len, break_len, auto_start }` | 用户配置 |
| 输出 | `FocusWindow[]`（含 start/end/建议时长） | 供客户端展示与触发 |
| 输出 | `FocusSession`（状态流转） | 专注会话记录 |

---

## 3. 对外接口（apps/api 提供）

| 接口 | 说明 |
|------|------|
| `GET /focus/windows?date=` | 当天专注时段 |
| `POST /focus/sessions` | 开启会话（`{ slot_id?, planned_min }`） |
| `PATCH /focus/sessions/:id` | 结束/中止（`{ status, actual_min }`） |
| `GET /focus/sessions?from=&to=` | 历史与统计 |

**会话状态流转**：`planned → running → completed | aborted`

---

## 4. 专注窗口计算示例（伪代码）

```
foreach slot in today_slots:
  if slot.kind in (class, study) and is_pending:
      windows.append({ start: slot.start, end: slot.end })
      # 可拆为 专注→休息 番茄钟 节奏
```

---

## 5. 事件

- 订阅：`schedule.updated`（重新计算窗口）、`data.synced`
- 发布：`focus.started`、`focus.ended`

---

## 6. 客户端约定

- 发起会话/结束会话**由用户操作**（或用户在设置里开启 auto-start）。
- 专注期间是否屏蔽通知由客户端实现（iOS: Focus/Do Not Disturb；Web: 通知降噪），本模块只负责时间点与状态。
