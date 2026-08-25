# 十一校园助手 · iOS 客户端 (BNDS Campus Companion)

> 面向十一学校学生（BNDSer）的个人化校园信息中枢 iOS 原生 App。严格遵循“以人为主导，AI 是导师而非决策者，处处可待定”的产品哲学。

---

## 一、界面架构与 3-Tab 体系

对齐 `docs/ux-ia.md` 规范：

```
┌────────────────────────────────────────────────────────┐
│                        iOS App                         │
├────────────────────┬───────────────────┬───────────────┤
│    Tab 1 · 我      │    Tab 2 · 今日   │  Tab 3 · 导师  │
│  (Personal Core)   │ (Today's Actions) │ (Invited AI)  │
└────────────────────┴───────────────────┴───────────────┘
```

- **Tab 1【我】（默认落点）**：
  - 顶部个人档案（头像、姓名、年级、兴趣板块 Chips、设置入口）
  - 分段选择：
    - `🧭 人生路径`：愿景 → 长期目标 → 短期目标 → 任务树状层级，节点四态（`进行中 / 已达成 / 待定 / 已放弃`），每个节点支持一键“问导师”。
    - `📈 成长账本`：过程性评价维度卡（含教师寄语）、各科成绩汇总、专注累积统计。
  - 用户专属节点编辑器：新增/修改/删除节点，用户亲手确认保存（`source: user`）。
- **Tab 2【今日】**：
  - 顶部今日主线目标横幅（从人生路径拉取，待定态醒目渲染）。
  - 日程时间轴：统一课表（上课教室/教师/时间段）+ 专注窗口。
  - 全屏沉浸专注模式：倒计时环、白噪音音效切换、打卡记录自动沉淀至成长账本。
- **Tab 3【导师】**：
  - 顶部常驻提示：“我是导师，决定权在你”。
  - 对话流 + 导师结构化建议卡。
  - 建议卡附带**“💡 为什么这么建议”**（透明可溯源依据）。
  - 点击“采纳”自动桥接跳转至 Tab 1 用户专属编辑器，由用户亲手确认落地（AI 界面无直接写权限）。
- **Onboarding 共创流程**：
  - 首次进入：兴趣领域选择 → 倾听人生想法 → AI 生成草案（允许待定） → 用户确认开启。

---

## 二、目录结构

```
apps/ios/
├── Package.swift
├── README.md
├── Sources/
│   ├── App/
│   │   ├── BNDSCompanionApp.swift         # iOS App 启动入口
│   │   ├── AppState.swift                 # 全局响应式状态管理中心
│   │   └── RootView.swift                 # 3-Tab 根路由
│   ├── Models/                            # 对齐 docs/data-model.md
│   │   ├── User.swift                     # 用户与兴趣模型
│   │   ├── LifePath.swift                 # 人生路径与节点四态
│   │   ├── Schedule.swift                 # 课程与日程时段
│   │   ├── Growth.swift                   # 过程性评价与成绩
│   │   ├── Focus.swift                    # 专注会话
│   │   └── Mentor.swift                   # 导师消息与结构化建议卡
│   ├── Services/
│   │   ├── APIClient.swift                # REST/SSE API Client
│   │   └── MockDataStore.swift            # 十一校园高保真 Mock 仓库
│   ├── Theme/
│   │   ├── BNDSColors.swift               # 校园紫红、藏蓝、状态四色
│   │   ├── BNDSTypography.swift           # 排版与跨平台修饰符
│   │   └── Components/
│   │       ├── StatusBadge.swift          # 状态徽章（进行中/已达成/待定/已放弃）
│   │       └── GlassCard.swift            # 拟物卡片容器
│   └── Features/
│       ├── Tab1_ProfileAndPath/           # 【我】Tab（路径树、成长账本、编辑器）
│       ├── Tab2_TodaySchedule/            # 【今日】Tab（课表时间轴、全屏专注模式）
│       ├── Tab3_MentorChat/               # 【导师】Tab（对话、建议卡、快捷提问）
│       └── Onboarding/                    # 首次共创接入流
└── Runner/
    └── main.swift                         # 自动化业务与契约校验器
```

---

## 三、构建与运行

### 命令行验证
在 `apps/ios/` 目录下：
```bash
# 编译并运行自动化校验
swift run BNDSCompanionRunner
```

### Xcode 中打开
双击 `Package.swift` 即可在 Xcode 中打开并直接在 iOS Simulator 中运行预览！
