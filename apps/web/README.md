# apps/web

十一校园助手 · 前端 Web 应用。对接基准：`docs/api-contract.md`、`docs/data-model.md`。
**本页同步了 iOS 端已实现的设计逻辑与设计语言，Web 端应保持一致。**

> 参考实现（iOS，作为设计事实源）：`apps/ios/Sources/`，见文末「从 iOS 到 Web 的映射」。

---

## 1. 设计逻辑（Design Logic）

### 1.1 顶层导航（3 大板块 + Onboarding 门控）

- **Onboarding 门控**：未完成时先进入 `OnboardingFlow`（3 步共创），完成后进入主界面。
- 主界面为 **3 Tab**（对齐 `docs/ux-ia.md` §2）：

| Tab | 名称 | 定位 | 入口 |
|-----|------|------|------|
| 0 | **我**（默认落点） | 个人核心：档案 + 人生路径树 / 成长账本 | 段落选择器 `路径 \| 成长` |
| 1 | **今日** | 当日行动：今日目标 + 课表时间轴 + 专注 | 无 |
| 2 | **导师** | 受邀导师：对话流 + 建议卡 | 无 |

- 主色 `tint` = 校园紫红（见 §2）。

### 1.2 全局状态（对应 iOS `AppState`）

单一全局 store，分担：
- **导航**：`selectedTab`（0 我 / 1 今日 / 2 导师）、`isOnboardingCompleted`
- **核心数据**：`currentUser`、`lifePath`、`courses`、`scheduleSlots`、`formativeAssessments`、`grades`、`focusSessions`、`mentorMessages`、`interestPillars`
- **模态/编辑态**：`isFocusModalPresented`、`isNodeEditorPresented`、`editingNode`、`activeContextTag`

### 1.3 业务操作（所有人主导的"写"）

> 所有会改变状态的**写操作只有用户能发起**；导师/AI 无直接写权限。

| 操作 | 规则 |
|------|------|
| 保存/更新节点 | `source → user`，写 `updated_at`；新节点 append |
| 切换状态 | 任意四态（进行中/已达成/待定/已放弃）；达成时写 `completed_at` |
| 删除节点 | 级联删除子节点 |
| 采纳导师建议 | 标记建议 `accepted`，**预填节点** → 跳到「我」并拉起**用户专属编辑器**，由用户亲手确认落地 |
| 暂缓/拒绝建议 | 仅更新建议卡状态，不改任何路径数据 |
| 问导师（带上下文） | 设置 `activeContextTag` → 跳「导师」并自动发送带上下文的提问，异步取回复 |
| 完成专注 | 记录一条 `FocusSession`（completed），关闭专注弹窗 |

### 1.4 关键交互模式（务必还原）

1. **导师建议无写权限**：建议卡仅提供 `采纳并去编辑器落地 / 暂缓 / 不采纳`。**没有"保存/确定"按钮**；采纳 = 跳回「我」的节点编辑器让用户手填确认。
2. **上下文问导师**：从成长评价、路径节点、日程时段可一键"问导师"，自动携带 `contextTag` 并切换到「导师」。
3. **待定是一等公民**：节点四态可视且**平等**（不灰化、不隐藏）；Onboarding 与节点编辑中都有"任何位置可标记待定"的明确提示。
4. **Onboarding 3 步共创**：① 选兴趣板块（网格多选）→ ② 写人生想法（AI 不评判按钮）→ ③ AI 路径草案（含"待定"占位）→ "亲手确认并开启旅程"。
5. **导师声明常驻**：导师页顶部常驻"我是你的辅导与建议者，所有规划与调整决定权永远在你。"

---

## 2. 设计语言（Design Tokens / 语言）

> 全部以 iOS `Sources/Theme/` 为基准。用设计令牌（design tokens）实现，勿硬编码散落值。

### 2.1 色彩令牌（`BNDSColors`）

| 令牌 | 色值 | 用途 |
|------|------|------|
| `crimson` | `#A31C2E` | 校园主色 / 主按钮 / Tab tint |
| `oxfordNavy` | `#1A2647` | 用户气泡 / 建议依据标题 / 强调文本 |
| `midnightBg` | `#0F141F` | 深色底 |
| `softBackground` | `#F5F5FA` | 浅色柔和底 |
| `inProgress` | `#2E8AFF` | 状态·进行中 |
| `achieved` | `#21B070` | 状态·已达成 |
| `pending` | `#F59E1E` | 状态·待定 / 建议卡高亮 |
| `abandoned` | `#848FA3` | 状态·已放弃 / 已婉拒 |
| `cardBackground` | 系统 `secondarySystemGroupedBackground` | 卡片底 |
| `groupBackground` | 系统 `systemGroupedBackground` | 页面底 |

### 2.2 渐变
- `bndsGradient`：`crimson → #D94052`（品牌）
- `mentorGradient`：`#5938BF → #2E8AFF`（导师区，紫→蓝）

### 2.3 字体层级（system 字体，`BNDSTypography`）
| 层级 | size / weight |
|------|---------------|
| 页面大标题 | 24 bold |
| 区块小标题 | 16 bold |
| 正文 | 15 regular / 13 regular |
| 次要/说明 | 12 · 11 · 10（medium/semibold） |
- 标题用 `bndsInlineTitle`（导航栏 inline mode）。

### 2.4 形状 / 阴影 / 间距
- 圆角：卡片 `16`（continuous），内嵌卡 `12–14`，泡泡 `18`，胶囊 `Capsule`。
- 阴影：`black 0.04, radius 8, y4`（卡片）。
- 描边：`primary 0.06, width 1`（卡片）；状态胶囊描边 `status 0.4`。
- 内边距：卡片 `16`，内嵌卡 `12–14`；区块 `18` 间距。

### 2.5 组件清单（Web 需提供等价组件）
- `GlassCard` 毛玻璃卡片容器
- `StatusBadge` 状态徽章（四态 + 图标 + 文案）
- `SuggestionCard` 导师建议卡（含"💡为什么"依据框 + 三操作）
- `InterestPillarCard` 兴趣板块卡（选中态：主色底 + 描边）
- `GrowthStatCard` 成长概览卡（图标 + 值 + 标题）
- `ChatMessageBubble` 聊天气泡（用户=藏蓝右对齐；导师=卡片左对齐 + 建议卡）
- `FocusModeModal` 专注全屏模态
- `NodeEditorSheet` 节点编辑器（落地用，用户专属）
- 胶囊快捷提问 `PromptShortcuts`

---

## 3. 从 iOS 到 Web 的映射（Design Logic → Web 组件）

| iOS | Web |
|-----|-----|
| `RootView`（TabView 3-Tab） | 左侧栏路由（我/今日/导师） |
| `AppState`（ObservableObject） | 全局 store（Pinia/Zustand/Redux） |
| `ProfileAndPathView`（分段：路径/成长） | 「我」页（分段控制器/标签） |
| `LifePathTreeView` | 路径树/列表 |
| `GrowthLedgerView` | 成长账本（统计卡 + 评价列表 + 成绩） |
| `TodayScheduleView` + `TimelineView` | 今日时间轴 |
| `FocusModeModal` | 专注视图（全屏/弹层） |
| `MentorChatView` + `SuggestionCardView` | 导师页 + 建议卡（右侧抽屉可复用） |
| `OnboardingFlowView` | Onboarding 向导 |

---

## 4. Web 适配注意

- 空间更大：可用**右侧 AI 导师抽屉**（不占主导航），主区始终展示用户自己的世界。
- 交互更精细：路径树/甘特、成绩趋势图、评价雷达图等可视化可更丰富。
- 仍遵守 `docs/ux-ia.md` §5 硬规矩：AI 无保存键、待定三态可视化、建议必带依据、决策入口属用户、AI 是侧翼不是封面。

---

## 5. 遵循规范

- 数据模型：`docs/data-model.md`
- API 对接：`docs/api-contract.md`、`docs/events.md`
- 信息架构与层级：`docs/ux-ia.md`
- 产品哲学：项目 `README.md` §三（AI 辅助、人决策）
