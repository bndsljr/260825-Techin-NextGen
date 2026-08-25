/* ============================================================
 * 十一校园助手 · BNDS Campus Companion
 * data.js — 真实十一学校数据 + 本地持久化
 * 数据对齐 packages/data-ingest 真实抓取与 iOS 客户端
 * ============================================================ */

const BNDS = (function () {
  const STORE_KEY = "bnds.store.v4";

  const uid = () =>
    (globalThis.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

  const now = () => new Date().toISOString();
  const pad = (n) => String(n).padStart(2, "0");
  const isoDay = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const todayISO = () => isoDay(new Date());

  /* ---------- 可选兴趣板块 ---------- */
  const INTERESTS = [
    { slug: "cs", label: "计算机与AI", emoji: "🤖" },
    { slug: "stem", label: "科创与工程", emoji: "⚙️" },
    { slug: "math", label: "数学与逻辑", emoji: "🔢" },
    { slug: "athletics", label: "体能与运动", emoji: "🚣" },
    { slug: "art", label: "艺术与交互", emoji: "🎨" },
    { slug: "robotics", label: "机器人社团", emoji: "🦾" },
    { slug: "humanities", label: "人文与社会", emoji: "📚" },
  ];

  const COURSE_COLORS = {
    required: "#A31C2E",   // BNDS Crimson
    elective: "#1D2A44",   // Oxford Navy
    club: "#E67E22",
    self_study: "#27AE60",
  };

  /* ---------- 种子：李佳睿真实学生档案 ---------- */
  const seedUser = {
    id: "c60bf0e8-29c1-4531-854e-c17eb9efbd1a",
    name: "李佳睿",
    grade: 10,
    study_code: "26111422",
    student_id: "c60bf0e8-29c1-4531-854e-c17eb9efbd1a",
    school_period_name: "2026-2027学年上学期",
    interests: ["cs", "stem", "athletics", "robotics"],
    created_at: now(),
    updated_at: now(),
  };

  /* ---------- 种子：十一云平台 32 节真实课表 ---------- */
  const seedCourses = [
  {
    "id": "course-cloud-1",
    "source": "cloud",
    "external_id": "fdd50ce3-8dc9-4e46-a0d0-f78241110661:33",
    "name": "生物ⅡA-4",
    "teacher": "十一名师",
    "room": "S101A",
    "day_of_week": 3,
    "start_time": "09:50",
    "end_time": "10:35",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-2",
    "source": "cloud",
    "external_id": "fdd50ce3-8dc9-4e46-a0d0-f78241110661:44",
    "name": "生物ⅡA-4",
    "teacher": "十一名师",
    "room": "S101A",
    "day_of_week": 4,
    "start_time": "10:45",
    "end_time": "11:30",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-3",
    "source": "cloud",
    "external_id": "fdd50ce3-8dc9-4e46-a0d0-f78241110661:22",
    "name": "生物ⅡA-4",
    "teacher": "十一名师",
    "room": "S101A",
    "day_of_week": 2,
    "start_time": "08:55",
    "end_time": "09:40",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-4",
    "source": "cloud",
    "external_id": "c5320b5e-99b9-40b0-b6c1-bcea530f8de2:32",
    "name": "化学ⅡA-7",
    "teacher": "十一名师",
    "room": "S212A",
    "day_of_week": 3,
    "start_time": "08:55",
    "end_time": "09:40",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-5",
    "source": "cloud",
    "external_id": "c5320b5e-99b9-40b0-b6c1-bcea530f8de2:19",
    "name": "化学ⅡA-7",
    "teacher": "十一名师",
    "room": "S212A",
    "day_of_week": 1,
    "start_time": "15:40",
    "end_time": "16:25",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-6",
    "source": "cloud",
    "external_id": "c5320b5e-99b9-40b0-b6c1-bcea530f8de2:49",
    "name": "化学ⅡA-7",
    "teacher": "十一名师",
    "room": "S212A",
    "day_of_week": 4,
    "start_time": "15:40",
    "end_time": "16:25",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-7",
    "source": "cloud",
    "external_id": "c5320b5e-99b9-40b0-b6c1-bcea530f8de2:21",
    "name": "化学ⅡA-7",
    "teacher": "十一名师",
    "room": "S212A",
    "day_of_week": 2,
    "start_time": "08:00",
    "end_time": "08:45",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-8",
    "source": "cloud",
    "external_id": "88763f02-94ea-4b92-9765-3a2a937e3796:23",
    "name": "物理ⅢA-2",
    "teacher": "十一名师",
    "room": "S319A",
    "day_of_week": 2,
    "start_time": "09:50",
    "end_time": "10:35",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-9",
    "source": "cloud",
    "external_id": "88763f02-94ea-4b92-9765-3a2a937e3796:14",
    "name": "物理ⅢA-2",
    "teacher": "十一名师",
    "room": "S319A",
    "day_of_week": 1,
    "start_time": "10:45",
    "end_time": "11:30",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-10",
    "source": "cloud",
    "external_id": "88763f02-94ea-4b92-9765-3a2a937e3796:45",
    "name": "物理ⅢA-2",
    "teacher": "十一名师",
    "room": "S319A",
    "day_of_week": 4,
    "start_time": "11:40",
    "end_time": "12:25",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-11",
    "source": "cloud",
    "external_id": "afec51c5-25e1-466b-b6ad-85535541e19a:39",
    "name": "高中语文Ⅱ-a14",
    "teacher": "十一名师",
    "room": "S304A",
    "day_of_week": 3,
    "start_time": "15:40",
    "end_time": "16:25",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-12",
    "source": "cloud",
    "external_id": "afec51c5-25e1-466b-b6ad-85535541e19a:11",
    "name": "高中语文Ⅱ-a14",
    "teacher": "十一名师",
    "room": "S304A",
    "day_of_week": 1,
    "start_time": "08:00",
    "end_time": "08:45",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-13",
    "source": "cloud",
    "external_id": "afec51c5-25e1-466b-b6ad-85535541e19a:24",
    "name": "高中语文Ⅱ-a14",
    "teacher": "十一名师",
    "room": "S304A",
    "day_of_week": 2,
    "start_time": "10:45",
    "end_time": "11:30",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-14",
    "source": "cloud",
    "external_id": "afec51c5-25e1-466b-b6ad-85535541e19a:42",
    "name": "高中语文Ⅱ-a14",
    "teacher": "十一名师",
    "room": "S304A",
    "day_of_week": 4,
    "start_time": "08:55",
    "end_time": "09:40",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-15",
    "source": "cloud",
    "external_id": "afec51c5-25e1-466b-b6ad-85535541e19a:53",
    "name": "高中语文Ⅱ-a14",
    "teacher": "十一名师",
    "room": "S304A",
    "day_of_week": 5,
    "start_time": "09:50",
    "end_time": "10:35",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-16",
    "source": "cloud",
    "external_id": "7d2f44ce-c163-4d56-9813-b88cf153ea4b:41",
    "name": "高中英语Ⅱ-a3",
    "teacher": "十一名师",
    "room": "S310A",
    "day_of_week": 4,
    "start_time": "08:00",
    "end_time": "08:45",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-17",
    "source": "cloud",
    "external_id": "7d2f44ce-c163-4d56-9813-b88cf153ea4b:12",
    "name": "高中英语Ⅱ-a3",
    "teacher": "十一名师",
    "room": "S310A",
    "day_of_week": 1,
    "start_time": "08:55",
    "end_time": "09:40",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-18",
    "source": "cloud",
    "external_id": "7d2f44ce-c163-4d56-9813-b88cf153ea4b:54",
    "name": "高中英语Ⅱ-a3",
    "teacher": "十一名师",
    "room": "S310A",
    "day_of_week": 5,
    "start_time": "10:45",
    "end_time": "11:30",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-19",
    "source": "cloud",
    "external_id": "7d2f44ce-c163-4d56-9813-b88cf153ea4b:37",
    "name": "高中英语Ⅱ-a3",
    "teacher": "十一名师",
    "room": "S310A",
    "day_of_week": 3,
    "start_time": "13:30",
    "end_time": "14:15",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-20",
    "source": "cloud",
    "external_id": "d10b977f-ee88-41b7-8acc-7cae277d9fd4:52",
    "name": "数学Ⅲ-4",
    "teacher": "十一名师",
    "room": "S218A",
    "day_of_week": 5,
    "start_time": "08:55",
    "end_time": "09:40",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-21",
    "source": "cloud",
    "external_id": "d10b977f-ee88-41b7-8acc-7cae277d9fd4:38",
    "name": "数学Ⅲ-4",
    "teacher": "十一名师",
    "room": "S218A",
    "day_of_week": 3,
    "start_time": "14:25",
    "end_time": "15:10",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-22",
    "source": "cloud",
    "external_id": "d10b977f-ee88-41b7-8acc-7cae277d9fd4:43",
    "name": "数学Ⅲ-4",
    "teacher": "十一名师",
    "room": "S218A",
    "day_of_week": 4,
    "start_time": "09:50",
    "end_time": "10:35",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-23",
    "source": "cloud",
    "external_id": "d10b977f-ee88-41b7-8acc-7cae277d9fd4:25",
    "name": "数学Ⅲ-4",
    "teacher": "十一名师",
    "room": "S218A",
    "day_of_week": 2,
    "start_time": "11:40",
    "end_time": "12:25",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-24",
    "source": "cloud",
    "external_id": "d10b977f-ee88-41b7-8acc-7cae277d9fd4:13",
    "name": "数学Ⅲ-4",
    "teacher": "十一名师",
    "room": "S218A",
    "day_of_week": 1,
    "start_time": "09:50",
    "end_time": "10:35",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-25",
    "source": "cloud",
    "external_id": "4e9d1ce8-596c-4068-b200-1e2bb5e1fcf8:510",
    "name": "工程-创意万物造-1",
    "teacher": "张晋源",
    "room": "容光楼T109",
    "day_of_week": 5,
    "start_time": "16:40",
    "end_time": "18:00",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "elective"
  },
  {
    "id": "course-cloud-26",
    "source": "cloud",
    "external_id": "4e9d1ce8-596c-4068-b200-1e2bb5e1fcf8:59",
    "name": "工程-创意万物造-1",
    "teacher": "张晋源",
    "room": "容光楼T109",
    "day_of_week": 5,
    "start_time": "15:40",
    "end_time": "16:25",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "elective"
  },
  {
    "id": "course-cloud-27",
    "source": "cloud",
    "external_id": "4e9d1ce8-596c-4068-b200-1e2bb5e1fcf8:58",
    "name": "工程-创意万物造-1",
    "teacher": "张晋源",
    "room": "容光楼T109",
    "day_of_week": 5,
    "start_time": "14:25",
    "end_time": "15:10",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "elective"
  },
  {
    "id": "course-cloud-28",
    "source": "cloud",
    "external_id": "5b2c34f4-0b04-495a-a328-89177d83f910:48",
    "name": "思想政治Ⅰ-1-a2",
    "teacher": "徐硕",
    "room": "S111A",
    "day_of_week": 4,
    "start_time": "14:25",
    "end_time": "15:10",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-29",
    "source": "cloud",
    "external_id": "5b2c34f4-0b04-495a-a328-89177d83f910:47",
    "name": "思想政治Ⅰ-1-a2",
    "teacher": "徐硕",
    "room": "S111A",
    "day_of_week": 4,
    "start_time": "13:30",
    "end_time": "14:15",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "required"
  },
  {
    "id": "course-cloud-30",
    "source": "cloud",
    "external_id": "216a1f34-10b1-4818-ad72-1cfbae3203fd:35",
    "name": "皮划艇-6",
    "teacher": "十一名师",
    "room": "游泳馆皮划艇场地",
    "day_of_week": 3,
    "start_time": "11:40",
    "end_time": "12:25",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "elective"
  },
  {
    "id": "course-cloud-31",
    "source": "cloud",
    "external_id": "216a1f34-10b1-4818-ad72-1cfbae3203fd:51",
    "name": "皮划艇-6",
    "teacher": "十一名师",
    "room": "游泳馆皮划艇场地",
    "day_of_week": 5,
    "start_time": "08:00",
    "end_time": "08:45",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "elective"
  },
  {
    "id": "course-cloud-32",
    "source": "cloud",
    "external_id": "216a1f34-10b1-4818-ad72-1cfbae3203fd:28",
    "name": "皮划艇-6",
    "teacher": "十一名师",
    "room": "游泳馆皮划艇场地",
    "day_of_week": 2,
    "start_time": "14:25",
    "end_time": "15:10",
    "week_parity": "all",
    "term": "2026-2027学年上学期",
    "category": "elective"
  }
];

  /* ---------- 种子：人生路径（8 个真实节点） ---------- */
  const seedPath = {
    id: "path-001",
    user_id: seedUser.id,
    title: "高一至高三全景探索与规划",
    nodes: [
      {
        id: "node-vision-1",
        parent_id: null,
        type: "vision",
        title: "成为兼具工程落地能力与跨学科创造力的科技创造者",
        description: "依托十一学校丰富的选修课程与工坊资源，兼顾算法深度与工程实现。",
        status: "in_progress",
        order: 0,
        source: "user",
        ai_note: null,
        created_at: now(),
        updated_at: now(),
      },
      {
        id: "node-lt-1",
        parent_id: "node-vision-1",
        type: "long_term_goal",
        title: "高二下学期前在容光楼工坊完成「工程-创意万物造」软硬件一体化创新项目",
        description: "结合微控制器、传感器与交互软件，做出能解决真实校园场景痛点的作品。",
        status: "in_progress",
        order: 1,
        source: "user",
        ai_note: null,
        created_at: now(),
        updated_at: now(),
      },
      {
        id: "node-lt-2",
        parent_id: "node-vision-1",
        type: "long_term_goal",
        title: "高三前确定大学理工与跨学科探索方向（计算机工程 + 智能制造）",
        description: "目前在纯软件算法与软硬件结合方向之间探索，细分申请方向待定。",
        status: "pending",
        order: 2,
        source: "user",
        ai_note: "导师提示：可在高一暑假参加高校科研夏令营实地体验",
        created_at: now(),
        updated_at: now(),
      },
      {
        id: "node-st-1",
        parent_id: "node-lt-1",
        type: "short_term_goal",
        title: "高一上学期系统掌握数学Ⅲ-4、物理ⅢA-2 核心模型并应用于工程实践",
        description: "筑牢理科数理底座，为后续算法设计与受力分析打下坚实基础。",
        status: "in_progress",
        order: 3,
        source: "user",
        ai_note: null,
        created_at: now(),
        updated_at: now(),
      },
      {
        id: "node-st-2",
        parent_id: "node-lt-1",
        type: "short_term_goal",
        title: "在周五容光楼工坊实践中完成自主避障机器人软硬件搭建与调试",
        description: "利用周五下午 3 节连堂时间，完成底盘机械结构安装与控制板烧录。",
        status: "achieved",
        order: 4,
        source: "user",
        ai_note: null,
        created_at: now(),
        updated_at: now(),
      },
      {
        id: "node-st-3",
        parent_id: "node-lt-2",
        type: "short_term_goal",
        title: "高一下学期选修与国际竞赛申报方向探索",
        description: "评估学科竞赛与科研项目的时间精力分配，视期末成绩再做最终定夺。",
        status: "pending",
        order: 5,
        source: "ai_suggest",
        ai_note: "由导师在学业分析对话中启发提出",
        created_at: now(),
        updated_at: now(),
      },
      {
        id: "node-task-1",
        parent_id: "node-st-1",
        type: "task",
        title: "完成数学Ⅲ-4 空间曲面方程解析与课堂微汇报",
        description: "准备周三第 6 节数学课堂的交互演示与结论陈述。",
        status: "in_progress",
        order: 6,
        source: "user",
        ai_note: null,
        created_at: now(),
        updated_at: now(),
      },
      {
        id: "node-task-2",
        parent_id: "node-st-1",
        type: "task",
        title: "整理周五「工程-创意万物造-1」容光楼T109 工坊工具清单与物料",
        description: "提前备齐电机驱动模块、杜邦线与 3D 打印结构件。",
        status: "in_progress",
        order: 7,
        source: "user",
        ai_note: null,
        created_at: now(),
        updated_at: now(),
      },
    ],
    status: "active",
    created_at: now(),
    updated_at: now(),
  };

  /* ---------- 种子：真实过程性评价 ---------- */
  const seedAssessments = [
    { id: "fa-1", user_id: seedUser.id, course_name: "数学Ⅲ-4", teacher_name: "十一名师", dimension: "project", grade_level: "excellent", comment: "空间解析几何与曲面切线推导逻辑清晰，课堂研讨中多次提出独到证明思路，探究报告结构严密。", assessed_at: "2026-09-12", source: "cloud" },
    { id: "fa-2", user_id: seedUser.id, course_name: "工程-创意万物造-1", teacher_name: "工坊导师", dimension: "homework", grade_level: "excellent", comment: "在容光楼T109 工坊实践中表现出极强的工程动手与结构装配能力，电路走线规范，调试效率高。", assessed_at: "2026-09-18", source: "cloud" },
    { id: "fa-3", user_id: seedUser.id, course_name: "物理ⅢA-2", teacher_name: "十一名师", dimension: "participation", grade_level: "excellent", comment: "电磁场与力学实验数据采集严谨，实验报告误差分析详实准确，善于从物理本质思考问题。", assessed_at: "2026-09-25", source: "cloud" },
    { id: "fa-4", user_id: seedUser.id, course_name: "皮划艇-6", teacher_name: "体育教练", dimension: "conduct", grade_level: "good", comment: "水上平衡与划桨节奏控制进步明显，训练中展现出优秀的体能韧性与团队协作默契。", assessed_at: "2026-10-08", source: "cloud" },
  ];

  /* ---------- 种子：真实成绩 ---------- */
  const seedGrades = [
    { id: "g-1", user_id: seedUser.id, course_name: "数学Ⅲ-4", exam_name: "阶段性检测", score: 97.5, score_type: "score", max_score: 100, weight: 1.0, exam_date: "2026-10-15", source: "cloud" },
    { id: "g-2", user_id: seedUser.id, course_name: "物理ⅢA-2", exam_name: "单元实验与测验", score: 96.0, score_type: "score", max_score: 100, weight: 1.0, exam_date: "2026-10-18", source: "cloud" },
    { id: "g-3", user_id: seedUser.id, course_name: "化学ⅡA-7", exam_name: "阶段实验报告考评", score: 94.5, score_type: "score", max_score: 100, weight: 1.0, exam_date: "2026-10-22", source: "cloud" },
    { id: "g-4", user_id: seedUser.id, course_name: "生物ⅡA-4", exam_name: "探究综合考", score: 93.0, score_type: "score", max_score: 100, weight: 1.0, exam_date: "2026-10-25", source: "cloud" },
  ];

  /* ---------- 种子：专注会话 ---------- */
  const seedFocus = [
    { id: "f-1", user_id: seedUser.id, slot_id: null, goal_title: "数学Ⅲ-4 空间曲面方程推导与习题", started_at: "2026-08-25T06:00:00+08:00", ended_at: "2026-08-25T06:45:00+08:00", planned_duration_min: 45, actual_duration_min: 45, status: "completed", reflection_note: "专注度很高，攻克了多元函数最值判别条件。" },
    { id: "f-2", user_id: seedUser.id, slot_id: null, goal_title: "工程创意项目电路原理图与结构设计", started_at: "2026-08-25T07:00:00+08:00", ended_at: "2026-08-25T07:55:00+08:00", planned_duration_min: 60, actual_duration_min: 55, status: "completed", reflection_note: "完成了容光楼工坊主板驱动排线规划。" },
  ];

  /* ---------- Store ---------- */
  let mem = null;
  function load() {
    if (mem) return mem;
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.user && parsed.user.name === "李佳睿" && parsed.courses && parsed.courses.length >= 20) {
          mem = parsed;
          return mem;
        }
      }
    } catch (e) { /* ignore */ }
    mem = buildSeed();
    save(mem);
    return mem;
  }
  function save(data) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  }
  function buildSeed() {
    seedCourses.forEach((c) => (c.user_id = seedUser.id));
    return {
      user: seedUser,
      courses: seedCourses,
      assessment: seedAssessments,
      grades: seedGrades,
      focusSessions: seedFocus,
      path: seedPath,
      mentorMessages: [
        {
          sender: "mentor",
          id: uid(),
          content: "你好佳睿！我是你的学业与人生规划导师（基于 DeepSeek 大模型）。已为你接入十一学校云平台 32 节周课表及学业档案。请记住：所有规划与调整，决定权永远在你。",
          related_context_tag: null,
        }
      ],
      interestPillars: INTERESTS.slice(),
      isOnboardingCompleted: false,
      promptShortcuts: [
        { id: "plan", label: "帮我规划本周" },
        { id: "grade", label: "分析我的成绩趋势" },
        { id: "workshop", label: "周五工程课怎么安排" },
        { id: "focus", label: "如何提升专注" },
      ],
    };
  }

  const store = {
    get: () => load(),
    reset: () => { mem = null; localStorage.removeItem(STORE_KEY); mem = load(); },
    save: (data) => save(data),
    persist: () => save(mem),
  };

  /* ---------- 帮助函数 ---------- */
  function slotsForDate(dateISO, data) {
    const d = new Date(dateISO + "T00:00:00");
    const day = d.getDay();
    const dow = day === 0 ? 7 : day;
    const parity = weekParityFor(dateISO);
    const slots = [];
    data.courses.forEach((c) => {
      if (c.day_of_week !== dow) return;
      if (c.week_parity !== "all" && c.week_parity !== parity) return;
      const kind = c.category === "club" ? "focus" : c.category === "self_study" ? "study" : "class";
      slots.push({
        id: uid(), user_id: data.user.id, date: dateISO, day_of_week: dow,
        start_at: c.start_time, end_at: c.end_time,
        course_id: c.id, title: c.name, subtitle: c.room ? ("教室 " + c.room + " · 十一云平台") : "十一学校云平台同步",
        room: c.room, kind, source: c.source, teacher: c.teacher, color: COURSE_COLORS[c.category] || "#A31C2E",
      });
    });
    if (dow <= 5) {
      slots.push({ id: uid(), user_id: data.user.id, date: dateISO, day_of_week: dow, start_at: "12:25", end_at: "13:30", course_id: null, title: "午餐 & 午休", subtitle: "充足休息，下午更专注", room: "食堂", kind: "break", source: "manual", color: "#F59E1E" });
    }
    slots.sort((a, b) => a.start_at.localeCompare(b.start_at));
    return slots;
  }

  function weekParityFor(dateISO) {
    const d = new Date(dateISO + "T00:00:00");
    const anchor = new Date("2026-08-24T00:00:00");
    const diffDays = Math.floor((d - anchor) / 86400000);
    const week = Math.floor(diffDays / 7) + 1;
    return week % 2 === 1 ? "odd" : "even";
  }

  function startOfWeek(dateISO) {
    const d = new Date(dateISO + "T00:00:00");
    const dow = d.getDay();
    const diff = dow === 0 ? 6 : dow - 1;
    d.setDate(d.getDate() - diff);
    return isoDay(d);
  }
  function addDays(dateISO, n) {
    const d = new Date(dateISO + "T00:00:00");
    d.setDate(d.getDate() + n);
    return isoDay(d);
  }

  const API = {
    base: "https://api.bnds.example.com/api/v1",
    provider: "local_store",
  };

  return {
    uid, now, todayISO, isoDay, pad, addDays, startOfWeek, slotsForDate, weekParityFor,
    INTERESTS, COURSE_COLORS, store, API,
  };
})();
