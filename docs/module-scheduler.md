# 模块对接 · 课表与日历（packages/scheduler）

> **负责把统一课表同步到系统日历，并生成专注触发用的时段。**

---

## 1. 职责

- 读取归一化课表（`Course[]`），生成每日时段 `ScheduleSlot[]`。
- 生成日历（ICS / 订阅链接），同步到 iOS / Web 系统日历。
- 支持周次/单双周、场地、教师等信息展开。

---

## 2. 输入 / 输出

| 方向 | 内容 | 说明 |
|------|------|------|
| 输入 | `Course[]`（统一课表） | 来自 `apps/api`（已由 data-ingest 归一化） |
| 输入 | `schedule.updated` 事件 | 触发重新生成 |
| 输出 | `ScheduleSlot[]`（按日展开） | 供日程展示与专注窗口 |
| 输出 | `calendar.ics` / 订阅 URL（CalDAV/ICS） | 供系统日历订阅 |
| 输出 | `schedule.changed` 事件 | 通知关注该事件的模块 |

---

## 3. 对外接口（app/api 提供）

| 接口 | 说明 |
|------|------|
| `GET /schedule/slots?from=&to=` | 按时间段取时段（客户端/专注用） |
| `GET /schedule/calendar.ics` | 导出 iCal 文件 |
| `GET /calendar/subscribe-url` | 返回订阅链接，客户端放入系统日历 |
| `POST /schedule/calendar/revoke` | 撤销订阅 |

---

## 4. 展开规则

- `week_parity: all|odd|even` → 对应单双周才生成。
- 生成时以 `date + day_of_week + start_time/end_time` 展开为具体一天的 `ScheduleSlot`。
- 冲突处理：同一时段多来源重叠时，保留 `source` 优先级（`manual` > `cloud` > `managebac`）并在 `conflicts` 中记录。
- 订阅链接需要 token 鉴权（`/calendar/subscribe-url?token=…`），过期可轮换。

---

## 5. 事件

- 订阅：`schedule.updated`、`data.synced`
- 发布：`schedule.changed`

---

## 6. 与专注模块的衔接

`scheduler` 生成的 `ScheduleSlot[kind=class|study]` 是 `focus` 模块决定"何时专注"的输入（见 `docs/module-focus.md`）。
