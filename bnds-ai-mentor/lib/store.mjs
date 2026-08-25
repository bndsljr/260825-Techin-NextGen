// store.mjs — 内存版数据 + 脱敏（demo）。真实行为接 packages/contracts + 业务接口。
// 约束落点：唯一写入口校验 actor === "user"；建议 source: "ai_suggest"，采纳后转 "user"；
// decision_required 一律由服务端决定，忽略客户端传入。

const SEED = {
  '202400101': {
    id: '202400101',
    studentNo: '202400101',
    name: '张明',
    className: '计算机类2301',
    enrolledAt: '2023-09',
    gpa: 3.42,
    avg: 86.5,
    credits: 61,
    gradesTrend: [
      { term: '2023-秋', gpa: 3.10 },
      { term: '2024-春', gpa: 3.38 },
      { term: '2024-秋', gpa: 3.55 },
    ],
    schedule: [
      { time: '周一 08:00-09:40', course: '数据结构', location: '理一201' },
      { time: '周一 10:10-11:50', course: '大学英语(四)', location: '外语楼302' },
      { time: '周三 14:00-15:40', course: '计算机网络', location: '实验楼B区' },
      { time: '周五 14:00-15:40', course: '操作系统', location: '理一301' },
    ],
    assessments: [
      { course: '数据结构', type: '期中', score: 82, weight: 0.3 },
      { course: '数据结构', type: '期末', score: 76, weight: 0.7 },
      { course: '计算机网络', type: '期中', score: 68, weight: 0.3 },
      { course: '大学英语(四)', type: '平时', score: 90, weight: 0.4 },
    ],
    lifePath: [
      {
        id: 'entry-1',
        kind: 'activity',
        title: '参加算法竞赛训练营',
        text: '报名校 ACM 集训队，目标本赛季 ICPC 区域赛铜奖',
        source: 'user',
        status: 'adopted',
        adoptedFrom: null,
        decisionRequired: false,
        createdAt: '2024-10-12T08:00:00Z',
      },
      {
        id: 'entry-2',
        kind: 'plan',
        title: '期末冲刺计划',
        text: '数据结构考前两周每天两小时真题 + 错题本复刷',
        source: 'user',
        status: 'pending',
        adoptedFrom: null,
        decisionRequired: false,
        createdAt: '2024-12-01T08:00:00Z',
      },
    ],
    suggestions: [],
  },
};

function getStudent(id) {
  return SEED[id] || null;
}

function maskName(name) {
  if (!name) return '同学';
  return name.charAt(0) + '同学';
}

function maskNo(no) {
  if (!no) return '****';
  const s = String(no);
  if (s.length <= 4) return s.slice(0, 1) + '****';
  return s.slice(0, 4) + '****' + s.slice(-2);
}

// 脱敏：替换真实姓名与学号。用于一切流向客户端的文本。
function desensitize(text, student) {
  if (!text) return text;
  let t = String(text);
  if (student) {
    if (student.name) t = t.split(student.name).join(maskName(student.name));
    if (student.studentNo) t = t.split(student.studentNo).join(maskNo(student.studentNo));
  }
  return t;
}

// 给 LLM 的 prompt 上下文（姓名/学号已打码，避免建议里带出隐私）
function getPromptContext(id) {
  const s = getStudent(id);
  if (!s) return null;
  return {
    maskedName: maskName(s.name),
    className: s.className,
    gpa: s.gpa,
    avg: s.avg,
    credits: s.credits,
    gradesTrend: s.gradesTrend,
    schedule: s.schedule,
    assessments: s.assessments,
    lifePath: s.lifePath.map((e) => ({
      kind: e.kind,
      title: e.title,
      text: desensitize(e.text, s),
      source: e.source,
      status: e.status,
    })),
  };
}

// 给客户端 meta 事件的安全上下文（已脱敏）
function getSafeContext(id) {
  const s = getStudent(id);
  if (!s) return null;
  return {
    student: {
      maskedName: maskName(s.name),
      maskedStudentNo: maskNo(s.studentNo),
      className: s.className,
    },
    grades: { gpa: s.gpa, avg: s.avg, credits: s.credits, trend: s.gradesTrend },
    schedule: s.schedule,
    assessments: s.assessments,
    lifePath: s.lifePath.map((e) => ({
      kind: e.kind,
      title: e.title,
      text: desensitize(e.text, s),
      source: e.source,
      status: e.status,
    })),
  };
}

function listSuggestions(id) {
  const s = getStudent(id);
  return s ? s.suggestions : [];
}

// 归一化模型吐出的结构化建议：强制 source 与 decision_required，并落库供后续采纳。
function normalizeSuggestion(id, raw, now) {
  const s = getStudent(id);
  if (!s || !raw || typeof raw !== 'object') return null;
  const kind = ['life_path_entry', 'schedule_adjust', 'assessment_plan', 'goal'].includes(raw.kind)
    ? raw.kind
    : 'life_path_entry';
  // decision_required 由服务端决定：模型只提供线索，最终是否"需要决策"由服务端覆写。
  const decisionRequired = typeof raw.decisionRequired === 'boolean' ? raw.decisionRequired : false;
  const rec = {
    id: 'sug-' + (++Seq.suggestion),
    kind,
    title: typeof raw.title === 'string' ? raw.title : '',
    text: typeof raw.text === 'string' ? raw.text : typeof raw.body === 'string' ? raw.body : '',
    detail: typeof raw.detail === 'string' ? raw.detail : '',
    importance: ['low', 'mid', 'high'].includes(raw.importance) ? raw.importance : 'mid',
    source: 'ai_suggest',
    status: 'pending',
    adoptedFrom: null,
    decisionRequired,
    createdAt: now,
  };
  s.suggestions.push(rec);
  return desensitize(rec, s);
}

const Seq = { suggestion: 0, entry: 2 };

// 唯一写入入口。返回 { status, body }。
// 约束：actor !== "user" => 403；decision_required 由服务端强制覆盖。
function applyEntry(id, payload) {
  const body = payload || {};
  if (!body.actor || body.actor !== 'user') {
    return {
      status: 403,
      body: {
        error: 'FORBIDDEN: only the student (actor=user) may author life-path entries',
        hint: 'received actor=' + String(body.actor) + ' — AI suggestions go through adopt, never direct writes.',
      },
    };
  }
  const s = getStudent(id);
  if (!s) return { status: 404, body: { error: 'student not found' } };

  let entry;
  if (body.suggestionId) {
    const sug = s.suggestions.find((x) => x.id === body.suggestionId);
    if (!sug) return { status: 404, body: { error: 'suggestion not found' } };
    // 采纳：source 由 ai_suggest 转为 user；decision_required 覆盖为 false（用户已决策）。
    entry = {
      id: 'entry-' + ++Seq.entry,
      kind: sug.kind,
      title: sug.title,
      text: sug.text,
      source: 'user',
      status: 'adopted',
      adoptedFrom: sug.id,
      decisionRequired: false,
      createdAt: new Date().toISOString(),
    };
  } else {
    entry = {
      id: 'entry-' + ++Seq.entry,
      kind: ['activity', 'plan', 'course', 'goal'].includes(body.kind) ? body.kind : 'plan',
      title: typeof body.title === 'string' ? body.title : '',
      text: typeof body.text === 'string' ? body.text : '',
      source: 'user',
      status: 'pending',
      adoptedFrom: null,
      decisionRequired: false, // 服务端强制覆盖
      createdAt: new Date().toISOString(),
    };
  }
  s.lifePath.push(entry);
  return { status: 201, body: desensitize(entry, s) };
}

// 业务接口 mock（对应真实路径 /life-path /schedule/slots /assessments /grades/summary）
function mockBusiness(id) {
  const s = getStudent(id);
  if (!s) return null;
  return {
    'life-path': s.lifePath.map((e) => desensitize(e, s)),
    'schedule/slots': s.schedule,
    assessments: s.assessments,
    'grades/summary': { gpa: s.gpa, avg: s.avg, credits: s.credits, trend: s.gradesTrend },
  };
}

export {
  getStudent,
  desensitize,
  getPromptContext,
  getSafeContext,
  listSuggestions,
  normalizeSuggestion,
  applyEntry,
  mockBusiness,
  maskName,
  maskNo,
};
