/* ============================================================
 * 十一校园助手 · BNDS Campus Companion
 * data.js — 模拟数据 + 本地持久化
 * 字段严格对齐 docs/data-model.md（User / LifePath / LifePathNode /
 * Course / ScheduleSlot / FormativeAssessment / Grade / FocusSession）
 * ============================================================ */

const BNDS = (function () {
  const STORE_KEY = "bnds.store.v1";

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

  /* ---------- 可选兴趣板块（/interests） ---------- */
  const INTERESTS = [
    { slug: "cs", label: "计算机 / AI", emoji: "🤖" },
    { slug: "math", label: "数学", emoji: "🔢" },
    { slug: "physics", label: "物理", emoji: "🔭" },
    { slug: "chemistry", label: "化学", emoji: "🧪" },
    { slug: "biology", label: "生物", emoji: "🧬" },
    { slug: "art", label: "艺术 / 设计", emoji: "🎨" },
    { slug: "sports", label: "体育", emoji: "⚽" },
    { slug: "music", label: "音乐", emoji: "🎵" },
    { slug: "clubs", label: "社团", emoji: "🎪" },
    { slug: "stem", label: "科创 / 工程", emoji: "💡" },
    { slug: "humanities", label: "人文 / 社科", emoji: "📚" },
    { slug: "college", label: "升学留学", emoji: "🌍" },
  ];

  const COURSE_COLORS = {
    required: "#4c5fe4",
    elective: "#8a63f1",
    club: "#f5a524",
    self_study: "#22b8a0",
  };

  /* ---------- 种子：用户 ---------- */
  const seedUser = {
    id: uid(),
    name: "张十一",
    grade: 10,
    interests: ["cs", "math", "art"],
    created_at: now(),
    updated_at: now(),
  };

  /* ---------- 种子：课表（合并 course 静态） ---------- */
  const seedCourses = [
    { id: uid(), source: "cloud", external_id: "C1", name: "数学", teacher: "王老师", room: "A-301", day_of_week: 1, start_time: "08:00", end_time: "08:45", week_parity: "all", term: "2026-Fall", category: "required" },
    { id: uid(), source: "cloud", external_id: "C2", name: "英语", teacher: "李老师", room: "A-205", day_of_week: 1, start_time: "08:55", end_time: "09:40", week_parity: "all", term: "2026-Fall", category: "required" },
    { id: uid(), source: "cloud", external_id: "C3", name: "物理", teacher: "陈老师", room: "B-101", day_of_week: 1, start_time: "10:00", end_time: "10:45", week_parity: "all", term: "2026-Fall", category: "required" },
    { id: uid(), source: "managebac", external_id: "C4", name: "化学", teacher: "赵老师", room: "B-205", day_of_week: 2, start_time: "08:00", end_time: "08:45", week_parity: "all", term: "2026-Fall", category: "elective" },
    { id: uid(), source: "managebac", external_id: "C5", name: "IB EE 研讨", teacher: "Mr. Lee", room: "L-12", day_of_week: 2, start_time: "09:00", end_time: "09:45", week_parity: "odd", term: "2026-Fall", category: "elective" },
    { id: uid(), source: "cloud", external_id: "C6", name: "语文", teacher: "孙老师", room: "A-102", day_of_week: 2, start_time: "10:05", end_time: "10:50", week_parity: "all", term: "2026-Fall", category: "required" },
    { id: uid(), source: "manual", external_id: "C7", name: "机器人社团", teacher: "张老师", room: "工坊·2F", day_of_week: 3, start_time: "15:30", end_time: "17:00", week_parity: "all", term: "2026-Fall", category: "club" },
    { id: uid(), source: "cloud", external_id: "C8", name: "生物", teacher: "周老师", room: "B-301", day_of_week: 3, start_time: "08:00", end_time: "08:45", week_parity: "all", term: "2026-Fall", category: "required" },
    { id: uid(), source: "manual", external_id: "C9", name: "晚自习", teacher: "", room: "自习室", day_of_week: 3, start_time: "19:00", end_time: "20:40", week_parity: "all", term: "2026-Fall", category: "self_study" },
    { id: uid(), source: "cloud", external_id: "C10", name: "历史", teacher: "吴老师", room: "A-403", day_of_week: 4, start_time: "10:00", end_time: "10:45", week_parity: "even", term: "2026-Fall", category: "required" },
    { id: uid(), source: "cloud", external_id: "C11", name: "体育", teacher: "刘老师", room: "田径场", day_of_week: 4, start_time: "15:30", end_time: "16:15", week_parity: "all", term: "2026-Fall", category: "required" },
    { id: uid(), source: "cloud", external_id: "C12", name: "信息科技", teacher: "高老师", room: "机房·D2", day_of_week: 5, start_time: "08:55", end_time: "09:40", week_parity: "all", term: "2026-Fall", category: "elective" },
  ];

  /* ---------- 种子：人生路径 ---------- */
  const seedPath = {
    id: uid(),
    user_id: null, // 绑定到 user.id
    title: "我的高中三年",
    nodes: [
      makeNode({ type: "vision", title: "成为能解决真实问题的工程师", description: "想动手做有实际影响的东西，而不是只做题。", status: "in_progress", order: 0, source: "user" }),
      makeNode({ type: "long_term_goal", title: "高三前完成一个 AI 项目", description: "用 AI 处理真实数据，比如帮助同学整理校园信息。", status: "in_progress", order: 1, source: "user" }),
      makeNode({ type: "interest", title: "人工智能·兴趣板块", description: "对机器学习与数据极有兴致。", status: "in_progress", order: 2, source: "user" }),
      makeNode({
        type: "short_term_goal", title: "期末数学提高到 A", description: "每周 2 次定量练习，整理错题本。",
        status: "in_progress", order: 3, source: "user",
        ai_note: "建议每次练习后复盘错题，效果更好。", start_at: "2026-09-01", due_at: "2026-11-15",
      }),
      makeNode({ type: "task", title: "报名机器人社团", description: "学期初社团招新，记得报名。", status: "achieved", order: 4, source: "user", completed_at: now(), due_at: "2026-09-10" }),
      makeNode({ type: "long_term_goal", title: "走读方向：出国留学", description: "方向待定，先做信息搜集。", status: "pending", order: 5, source: "user", ai_note: "人生方向可以待定，这里不强求。", due_at: "2027-06-01" }),
    ],
    status: "active",
    created_at: now(),
    updated_at: now(),
  };
  seedPath.user_id = seedUser.id;

  function makeNode(o) {
    return Object.assign(
      { id: uid(), parent_id: null, description: "", start_at: null, due_at: null, completed_at: null, ai_note: null },
      o
    );
  }

  /* ---------- 种子：评价 / 成绩 ---------- */
  const seedAssessments = [
    { id: uid(), user_id: null, course_id: null, dimension: "participation", grade_level: "excellent", comment: "课堂积极，合作佳", assessed_at: "2026-09-12", source: "cloud" },
    { id: uid(), user_id: null, course_id: null, dimension: "homework", grade_level: "good", comment: "作业完成质量稳定", assessed_at: "2026-09-18", source: "cloud" },
    { id: uid(), user_id: null, course_id: null, dimension: "quiz", grade_level: "excellent", comment: "单元小测满分", assessed_at: "2026-09-25", source: "managebac" },
    { id: uid(), user_id: null, course_id: null, dimension: "project", grade_level: "pass", comment: "项目展示中规中矩，可再深入", assessed_at: "2026-10-02", source: "managebac" },
    { id: uid(), user_id: null, course_id: null, dimension: "conduct", grade_level: "excellent", comment: "遵守课堂规范", assessed_at: "2026-10-08", source: "cloud" },
  ];
  const seedGrades = [
    { id: uid(), user_id: null, course_id: null, exam_name: "第一次月考", score: 88, score_type: "score", max_score: 100, weight: 0.3, exam_date: "2026-10-12", source: "cloud" },
    { id: uid(), user_id: null, course_id: null, exam_name: "第二次月考", score: 92, score_type: "score", max_score: 100, weight: 0.3, exam_date: "2026-11-08", source: "cloud" },
    { id: uid(), user_id: null, course_id: null, exam_name: "期中考试", score: 90, score_type: "score", max_score: 100, weight: 0.4, exam_date: "2026-11-20", source: "managebac" },
  ];

  /* ---------- 种子：专注会话 ---------- */
  const seedFocus = [
    { id: uid(), user_id: null, slot_id: null, started_at: "2026-11-16T18:30:00+08:00", ended_at: "2026-11-16T19:20:00+08:00", planned_duration_min: 45, actual_duration_min: 50, status: "completed" },
    { id: uid(), user_id: null, slot_id: null, started_at: "2026-11-17T18:00:00+08:00", ended_at: "2026-11-17T18:35:00+08:00", planned_duration_min: 45, actual_duration_min: 35, status: "aborted" },
  ];

  /* ---------- Store ---------- */
  let mem = null;
  function load() {
    if (mem) return mem;
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        mem = JSON.parse(raw);
        return mem;
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
    seedAssessments.forEach((a) => (a.user_id = seedUser.id));
    seedGrades.forEach((g) => (g.user_id = seedUser.id));
    seedFocus.forEach((f) => (f.user_id = seedUser.id));
    return {
      user: seedUser,
      courses: seedCourses,
      assessment: seedAssessments,
      grades: seedGrades,
      focusSessions: seedFocus,
      path: seedPath,
      mentorHistory: [],
    };
  }

  const store = {
    get: () => load(),
    reset: () => { mem = null; localStorage.removeItem(STORE_KEY); mem = load(); },
    save: (data) => save(data),
    persist: () => save(mem),
  };

  /* ---------- 帮助函数 ---------- */

  // 生成某日的 ScheduleSlot[]（基于 Course + 周奇偶）
  function slotsForDate(dateISO, data) {
    const d = new Date(dateISO + "T00:00:00");
    const day = d.getDay(); // 0-6
    const dow = day === 0 ? 7 : day;
    const parity = weekParityFor(dateISO);
    const slots = [];
    data.courses.forEach((c) => {
      if (c.day_of_week !== dow) return;
      if (c.week_parity !== "all" && c.week_parity !== parity) return;
      const start = dateISO + "T" + c.start_time + ":00+08:00";
      const end = dateISO + "T" + c.end_time + ":00+08:00";
      const kind = c.category === "club" ? "focus" : c.category === "self_study" ? "focus" : "class";
      const slot = {
        id: uid(), date: dateISO, start_at: start, end_at: end,
        course_id: c.id, title: c.name, kind, source: "schedule",
        teacher: c.teacher, room: c.room, category: c.category, color: COURSE_COLORS[c.category] || "#4c5fe4",
      };
      slots.push(slot);
    });
    // 中午休息 slot
    if (dow <= 5) {
      slots.push({ id: uid(), date: dateISO, start_at: dateISO + "T12:00:00+08:00", end_at: dateISO + "T13:30:00+08:00", course_id: null, title: "午餐 & 午休", kind: "break", source: "schedule", room: "食堂" });
    }
    slots.sort((a, b) => a.start_at.localeCompare(b.start_at));
    return slots;
  }

  function weekParityFor(dateISO) {
    const d = new Date(dateISO + "T00:00:00");
    // 以 2026-08-24 为 odd 周（第 1 周）锚点；粗略即可
    const anchor = new Date("2026-08-24T00:00:00");
    const diffDays = Math.floor((d - anchor) / 86400000);
    const week = Math.floor(diffDays / 7) + 1;
    return week % 2 === 1 ? "odd" : "even";
  }

  function startOfWeek(dateISO) {
    const d = new Date(dateISO + "T00:00:00");
    const dow = d.getDay(); // 0-6
    const diff = dow === 0 ? 6 : dow - 1; // 周一作为一周开始
    d.setDate(d.getDate() - diff);
    return isoDay(d);
  }
  function addDays(dateISO, n) {
    const d = new Date(dateISO + "T00:00:00");
    d.setDate(d.getDate() + n);
    return isoDay(d);
  }

  return {
    uid, now, todayISO, isoDay, pad, addDays, startOfWeek, slotsForDate, weekParityFor,
    INTERESTS, COURSE_COLORS, store,
  };
})();
