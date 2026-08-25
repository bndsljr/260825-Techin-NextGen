# packages/data-ingest

> 🔌 **平台信息对接** —— 外部平台（十一学校云平台 / ManageBac）数据的**唯一接入通道**。
> 拉取 → 归一化 → 幂等去重 → 发事件 → 出报告。对接基准见 `docs/module-data-ingest.md`。

**只读外部平台，不写回；不做任何业务决策；成绩/评价先脱敏再进入展示/AI。**
本包不落库：真正的持久化与 UUID 分配由 `apps/api` 完成。

---

## 目录结构

```
packages/data-ingest/
├── package.json / tsconfig.json
├── src/
│   ├── index.ts            # 对外出口（唯一 import 入口）
│   ├── model.ts            # 🔑 归一化数据模型（与 docs/data-model.md 对齐）
│   ├── normalize.ts        # 归一化工具：时间/星期/单双周/类别/校验
│   ├── dedupe.ts           # 幂等去重（source:external_id）
│   ├── key-store.ts        # 幂等键存储接口 + 内存实现
│   ├── events.ts           # 事件契约（data.synced / assessment.new / grade.new）
│   ├── report.ts           # 同步报告 SyncReport
│   ├── pipeline.ts         # 编排：fetch→normalize→dedupe→emit→report
│   ├── errors.ts           # 错误 / 冲突
│   ├── csv.ts  ical.ts     # CSV / iCal 解析器（无外部依赖）
│   ├── cli.ts              # 命令行演示
│   └── adapters/
│       ├── types.ts            # Adapter / SyncContext / Crawler 契约
│       ├── normalize-payload.ts# 原始行→归一化实体的共享映射
│       ├── manual.ts           # 手动导入（JSON / CSV / iCal）—— 已完成
│       ├── cloud.ts            # 云平台适配器（框架 + 爬虫插槽）
│       └── managebac.ts        # ManageBac 适配器（框架 + 爬虫插槽）
└── test/                    # node:test 单测 + fixtures
```

---

## 快速开始

```bash
# 类型检查
npm run typecheck        # = tsc --noEmit

# 单元测试（35 个用例）
npm test                 # = node --test

# 端到端演示：手动导入 JSON / CSV / iCal
node src/cli.ts test/fixtures/manual-courses.json
node src/cli.ts test/fixtures/manual-courses.csv
node src/cli.ts test/fixtures/manual-courses.ics
```

> 运行无需构建：Node ≥ 22 原生支持 TypeScript 类型剥离。要求 TS 语法**不使参数属性**（`constructor(private readonly x)` 不支持），源码已遵循。

### 云平台爬虫（Python）

云平台走 **SSO/CAS 登录**，用 Python + requests 实现（HTTP + 会话 + 解析最稳）：

```bash
# 登录后抓取课表 / 个人档案 / 过程性评价，产出 CloudRawPayload
python3 scripts/cloud_crawler.py --out test/fixtures/cloud.json

# 凭据放 gitignored 文件里（脚本从 scripts/.credentials.json 读取）
printf '{"username":"你的学号","password":"你的密码","service":"https://bnds.idsp.yunxiao.com/Portal/LayoutD/CasLogin.aspx?ax=1"}\n' \
  > scripts/.credentials.json
```

爬虫产出的是 `CloudRawPayload`（`test/fixtures/cloud.json`），把它喂给 `CloudAdapter` 即可归一化为统一模型。

---

## 云平台接入（真实调研结果）

> 已完成对 `bnds.idsp.yunxiao.com` 的登录与数据结构调研，只读操作。

### 1) 登录流程（SSO/CAS）

```
bnds.idsp.yunxiao.com/Portal/LayoutD/Login.aspx
  → 302 到 account-wan.yunxiao.com/partner?service=...CasLogin.aspx?ax=1
  → POST account-wan.yunxiao.com/   (form: loginName/password/domain=bnds/service)
  → 返回 { service: ...?ticket=ST-... }
  → GET service → 302 回 bnds，Set-Cookie .ASPXAUTH（会话）+ YXSSID（passport TGT）
```

会话 cookie：`YXSSID`（passport TGT）、`.ASPXAUTH`（bnds 认证）。

### 2) 数据结构与接口（只读）

| 数据 | 接口 | 说明 |
|------|------|------|
| **课表** | `/BaseInfos/TimeTable/GetStudentCourseList?ax=1&studentId=&schoolPeriodId=&learnSectionId=<代码>` | `learnSectionId` 传**学段代码**（如 `1`）而非 GUID；返回 `{studentName, courseGroupList[]}` |
| 课表项 | `courseGroupList[i]` | `{whatTime, courseGroupName, roomName, teacherName, classTime, courseGroupId, color,...}` |
| 课表解码 | `whatTime`=`"${day}${period}"`（day=1..5 周一到周五）；`classTime`=`"09:50-10:35"` | 一节课 = 一门重复的周课 |
| 学期/学段 | `/BaseInfos/TimeTable/GetSchoolPeriods` / `GetLearnSections` / `GetCourseMax` | `GetCourseMax` 给当前 `schoolPeriodId`/`learnSection`/`studentId`/`courseNum` |
| **个人信息** | `/BaseInfos/StudentInfoTG/MyStudentInfo` | 服务端渲染表单 → 姓名/学号/性别/生日/手机/监护人 |
| **过程性评价** | `/Eval/MyEvalResult/List2?SchoolPeriodId=&StudentId=&SectionCode=&processViewMode=summary` | 列：课程/教学班/任课教师/评价时间/过程性评价/备注；明细 `/Eval/StudentPED/List` |
| 成绩 | `/Eval/MyEvalResult/DownloadDetail` 等 | 见 `grade` 相关菜单 |

### 3) 实际抓到的样例（2026-08）

- 学生：**李佳睿 (高一)**，学号 `26111422`，生日 `2010-09-29`。（注：云平台「个人信息」里的**性别字段有误，不采信**，`profile.gender` 一律不提取，留待可信来源确认。）
- 课表：`2026-2027学年上学期`，**32 节**（周一~周五，含 数学Ⅲ-4 / 物理ⅢA-2 / 化学ⅡA-7 / 生物ⅡA-4 / 高中语文Ⅱ-a14 / 高中英语Ⅱ-a3 / 思想政治Ⅰ / 皮划艇-6 / 工程-创意万物造 等）。
- 过程性评价：因学期刚开始，均为「暂未评价」。样张已存 `test/fixtures/cloud.json`。
- 身份键：用户「学生 GUID」`c60bf0e8-29c1-4531-854e-c17eb9efbd1a`（来自个人信息页 `Id`），跨接口用于 `studentId`。

### 4) 归一化映射（课表项 → NormalizedCourse）

| 平台字段 | 归一化字段 |
|----------|-----------|
| `courseGroupName` | `name` |
| `roomName` | `room` |
| `teacherName` | `teacher`（多数为空） |
| `whatTime` 首位 | `day_of_week`（1-5） |
| `classTime` 拆分 | `start_time` / `end_time` |
| `courseGroupId + ":" + whatTime` | `external_id`（幂等去重键，保留每周每节） |
| 学期名 | `term` |
| 名称关键词启发式 | `category`（皮划艇/工程/创意→elective 等） |

---

## Phase 0 数据调研清单（关键待办）

---

## 核心概念

### 1) 适配器 `Adapter`（每个数据源一个）

```ts
interface Adapter {
  readonly source: 'cloud' | 'managebac' | 'manual';
  fetch(ctx: SyncContext): Promise<unknown>;   // 拿原始数据
  normalize(ctx: SyncContext, raw: unknown): NormalizedData; // 归一化
}
```

- **manual**：已实现，解析用户导入的 JSON 信封 / CSV / iCal（第一版最稳妥方案）
- **cloud**：已实现爬虫（`scripts/cloud_crawler.py`，Python/SSO 登录）→ 产出 `CloudRawPayload`，`CloudAdapter` 归一化。运行时注入 `Crawler`（示例：`new CloudAdapter(crawler)`）。
- **managebac**：真实爬虫待接入（接入方式未确认）。`fetch` 目前抛 `NOT_IMPLEMENTED`，接入时注入一个 `Crawler` 即可。

### 2) 爬虫注入点 `Crawler`（云平台 / MB 待实现）

```ts
interface Crawler {
  fetch(ctx: SyncContext): Promise<unknown>;   // 返回「爬虫约定的中间格式」
}
```

`cloud` / `managebac` 的 `normalize` 接收一种**中间格式**（`CloudRawPayload` / `ManageBacRawPayload`，见各文件顶部与 `test/fixtures/*.json`），它由将来的爬虫产出。**拿到真实站点后，写 `Crawler` 产出该形状即可复用 normalize。**

### 3) 归一化模型

`NormalizedData = { courses, assessments, grades, raw_meta }`。字段/枚举以 `docs/data-model.md` 为权威；本包类型与之对齐（待 `packages/contracts` 落地后迁移过去）。

### 4) 幂等去重

身份键 = `source + external_id`（见 `dedupe.ts`）。`pipeline.runSync` 用「已入库键集合」（来自 `apps/api` 存储层）过滤，只把新增实体发事件、避免重复落库。

### 5) 事件（对齐 `docs/events.md`）

- 订阅：`data.ingest_requested`
- 发布：`data.synced` / `assessment.new` / `grade.new`（`actor: 'system'`）

### 6) 同步报告

每次同步返回 `SyncReport`（`status / counts / added / deduped / errors / warnings / conflicts`），交给 `apps/api` 转发给客户端展示。

---

## 与 apps/api 的对接

| 内部接口（仅 api ↔ data-ingest） | 说明 |
|------|------|
| `POST /internal/data-ingest/:source/sync` | 外部触发同步，返回 `SyncReport` |
| `POST /internal/data-ingest/normalized` | data-ingest 提交归一化结果（幂等，以外键去重） |
| `GET /internal/data-ingest/:source/status` | 查询某数据源同步状态 |

## 与 Web / 客户端的事件流

```
客户端 POST /schedule/sync
  → data.ingest_requested { source }
  → [本包] runSync：fetch→normalize→dedupe→emit
  → data.synced / assessment.new / grade.new
  → apps/api 落库 → 分发给客户端 / scheduler / ai
```

---

## Phase 0 数据调研清单（关键待办）

云平台 / ManageBac 的**接入方式与数据格式尚未确认**，第一版以「用户导入 → 应用解析归一化」为重（`manual` 已可跑通）。接入真实平台时，依次确认：

- [ ] 云平台是否提供开放 **API / 导出（CSV/XLSX/iCal）**，还是只能页面抓取
- [ ] ManageBac 的 **API 授权方式**（OAuth？）或导出（IB 数据常用导出）
- [ ] 课表字段：`名称/教师/教室/星期/开始-结束/单双周/学期/类别` 的实际取值
- [ ] 过程性评价维度与等级的**取值范围**（对齐 `AssessmentDimension` / `GradeLevel`）
- [ ] 成绩：分数 or 等级（IB 为 1–7）、权重、满分、考试名称的实际结构
- [ ] 合规：**授权抓取**、数据脱敏（成绩/评价进入展示/AI 前去掉姓名/学号）、合规要求

> 拿到真实站点/样例后，把 `test/fixtures/cloud.json`、`managebac.json` 换成真实字段样例，并实现对应的 `Crawler`。

---

## 隐私与合规（必读）

- 只通过**授权**方式获取数据，禁止绕过授权抓取。
- 成绩、过程性评价属敏感数据：进入展示或 AI 前先**脱敏**（见 `docs/module-ai.md`）。
- 数据最小化收集，明确用途；遵守教育数据相关法规与学校规范。

---

## 设计取舍与后续事项

- **类型自洽 vs 契约依赖**：`packages/contracts` 目前尚未落地，故先在 `model.ts` 自洽定义并与 `docs/data-model.md` 对齐；待 `contracts` 完成后同步迁移。**请勿在两处各自扩展字段。**
- **真实格式未知**：cloud/managebac 的中间格式是建议性契约，抓取真实站点后可能需要调整字段名。
- **`runSync` 失败不抛**：默认返回失败报告（`onError:'report'`），便于上层统一上报；需要抛出时设 `onError:'throw'`。
