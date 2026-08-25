(function () {
  const B = BNDS;
  const { store, INTERESTS, uid, now, todayISO, pad, slotsForDate } = B;

  const S = {
    tab: 0,
    seg: "path",
    editingNode: null,
    draftFromSuggestion: null,
    activeContextTag: null,
    focus: { running: false, remaining: 0, total: 0, timerId: null },
    mentor: { contextTag: null, typing: false },
  };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const view = $("#view");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  let toastTimer = null;
  function toast(msg, type) {
    const el = $("#toast");
    el.textContent = msg;
    el.className = "toast" + (type ? " " + type : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add("hidden"), 2400);
  }
  function persistToast(msg, ok) { toast(msg, ok ? "ok" : "warn"); }

  const statusMeta = {
    in_progress: { label: "进行中", cls: "in-progress", emoji: "🟢" },
    achieved: { label: "已达成", cls: "achieved", emoji: "✅" },
    pending: { label: "待定", cls: "pending", emoji: "⏳" },
    abandoned: { label: "已放弃", cls: "abandoned", emoji: "🚫" },
  };
  const typeLabel = {
    vision: "愿景", long_term_goal: "长期目标", short_term_goal: "短期目标",
    task: "任务", interest: "兴趣板块", note: "备注",
  };
  function badge(status) {
    const m = statusMeta[status] || { label: status, cls: "", emoji: "•" };
    return '<span class="badge ' + m.cls + '"><span class="dot"></span>' + m.emoji + " " + m.label + "</span>";
  }
  function emptyBox(emo, text) { return '<div class="empty"><div class="emo">' + emo + "</div>" + esc(text) + "</div>"; }

  /* ---------- Shell & nav ---------- */
  function renderShell() {
    const d = store.get();
    $("#topbarUser").textContent = d.user.name + " · 高一";
    $("#sidebarFoot").innerHTML =
      '<div class="foot-line"><span>数据来源</span><span class="tag primary">Mock</span></div>' +
      '<div class="foot-line"><span>AI 边界</span><span class="tag accent">只建议不写</span></div>' +
      '<div>🫵 决策权永远在你</div>';
    document.querySelectorAll(".nav-link").forEach((a) => {
      a.addEventListener("click", () => setTab(parseInt(a.dataset.tab, 10)));
    });
    $("#menuBtn").addEventListener("click", () => { $("#sidebar").classList.add("open"); $("#backdrop").classList.add("show"); });
    $("#backdrop").addEventListener("click", () => { $("#sidebar").classList.remove("open"); $("#backdrop").classList.remove("show"); });
  }
  function setTab(n) {
    S.tab = n;
    document.querySelectorAll(".nav-link").forEach((a) => a.classList.toggle("active", parseInt(a.dataset.tab, 10) === n));
    closeSidebar();
    renderMain();
  }
  function closeSidebar() { $("#sidebar").classList.remove("open"); $("#backdrop").classList.remove("show"); }
  function renderMain() {
    if (S.tab === 0) renderMe();
    else if (S.tab === 1) renderToday();
    else renderMentor();
    window.scrollTo({ top: 0 });
  }

  /* ---------- 我 : 路径 / 成长 ---------- */
  function renderMe() {
    const d = store.get();
    const segHTML = '<div class="seg" id="segBox"><button data-seg="path" class="' + (S.seg === "path" ? "active" : "") + '">路径</button><button data-seg="growth" class="' + (S.seg === "growth" ? "active" : "") + '">成长</button></div>';
    const head = '<div class="page-head"><div><div class="page-title">我</div><div class="page-sub">' + esc(d.user.name) + " · 个人核心 · 人生路径与成长账本</div></div>" + segHTML + "</div>";
    view.innerHTML = head + (S.seg === "path" ? renderPathBody(d) : renderGrowthBody(d));
    const segs = document.querySelectorAll("[data-seg]");
    segs.forEach((b) => (b.onclick = () => { S.seg = b.dataset.seg; renderMe(); }));
    bindLifePathActions();
    bindGrowthActions();
  }

  function renderPathBody(d) {
    const nodes = d.path.nodes.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    const counts = { in_progress: 0, achieved: 0, pending: 0, abandoned: 0 };
    nodes.forEach((n) => (counts[n.status] = (counts[n.status] || 0) + 1));
    const list = nodes.length
      ? nodes.map((n) => nodeCardHTML(n)).join("")
      : emptyBox("🧭", "还没有节点，点右上「添加节点」开始，或先走完 Onboarding");
    return '<div class="card"><div class="card-head"><span class="card-title">人生路径</span><button class="btn sm" id="addNode">+ 添加节点</button></div>' +
      '<div class="text-soft" style="font-size:13px;margin-bottom:14px">' +
      '<span class="tag primary">进行中 ' + counts.in_progress + '</span> ' +
      '<span class="tag accent">已达成 ' + counts.achieved + '</span> ' +
      '<span class="tag warn">待定 ' + counts.pending + '</span> ' +
      '<span class="tag muted">已放弃 ' + counts.abandoned + '</span></div>' +
      '<div class="timeline">' + list + "</div></div>" +
      '<div class="ob-note" style="background:var(--oxford-soft);color:var(--oxford)">🫵 状态四态平等，任何节点都可标「待定」、暂停或推翻；AI 永远只帮你梳理。</div>';
  }

  function nodeCardHTML(n) {
    const m = statusMeta[n.status] || {};
    return '<div class="node-item ' + n.status + '"><div class="node-card">' +
      '<div class="node-type">' + esc(typeLabel[n.type] || n.type) + "</div>" +
      '<div class="node-title">' + esc(n.title) + "</div>" +
      (n.description ? '<div class="node-desc">' + esc(n.description) + "</div>" : "") +
      (n.ai_note ? '<div class="node-foot"><span class="note">AI 依据：' + esc(n.ai_note) + "</span></div>" : "") +
      '<div class="node-foot">' + badge(n.status) +
      (n.due_at ? '<span class="text-faint" style="font-size:12px">截止 ' + esc(n.due_at) + "</span>" : "") +
      '<span style="margin-left:auto;display:flex;gap:8px">' +
      '<button class="where-btn" data-qnode="' + n.id + '">🧑‍🏫 问导师</button>' +
      '<button class="btn sm ghost" data-edit="' + n.id + '">编辑</button></span></div></div></div>';
  }

  function bindLifePathActions() {
    const add = $("#addNode");
    if (add) add.onclick = () => openNodeEditor(null);
    document.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => {
      const d = store.get();
      openNodeEditor(d.path.nodes.find((x) => x.id === b.dataset.edit));
    }));
    document.querySelectorAll("[data-qnode]").forEach((b) => (b.onclick = () => {
      const d = store.get();
      const n = d.path.nodes.find((x) => x.id === b.dataset.qnode);
      if (n) askMentor("路径节点「" + n.title + "」", { kind: "node", node: n });
    }));
  }

  function renderGrowthBody(d) {
    const avg = gradeAvg(d.grades);
    const nAssess = d.assessment.length;
    const nDone = d.path.nodes.filter((n) => n.status === "achieved").length;
    const nPending = d.path.nodes.filter((n) => n.status === "pending").length;
    const stats =
      '<div class="grid grid-4" style="grid-template-columns:repeat(4,1fr)">' +
      growthStat("📊", "blue", avg, "平均成绩") +
      growthStat("📝", "purple", String(nAssess), "过程性评价") +
      growthStat("✅", "green", String(nDone), "已达成目标") +
      growthStat("⏳", "orange", String(nPending), "待定目标") + "</div>";

    const assessHTML = d.assessment.length
      ? d.assessment.slice().reverse().map((a) => {
          const g = gradeMeta(a.grade_level);
          return '<div class="timeline-slot" style="border-bottom:none"><div class="t-line" style="background:' + g.color + '"></div><div class="t-main"><div class="t-title">' + esc(dimensionLabel(a.dimension)) + " · " + g.label + '</div><div class="t-meta">' + esc(a.comment) + " · " + esc(a.assessed_at) + '</div><button class="where-btn" data-qassess="' + a.id + '">🧑‍🏫 问导师</button></div></div>';
        }).join("")
      : emptyBox("📝", "还没有评价记录");

    const gradeHTML = d.grades.length
      ? d.grades.map((g) => '<div class="timeline-slot" style="border-bottom:none"><div class="t-line" style="background:var(--in-progress)"></div><div class="t-main"><div class="t-title">' + esc(g.exam_name) + " · <b>" + g.score + "</b> / " + g.max_score + '</div><div class="t-meta">' + esc(g.exam_date) + " · 权重 " + g.weight + '</div></div></div>').join("")
      : emptyBox("📈", "还没有成绩记录");

    return '<div class="grid grid-2">' +
      '<div class="card"><div class="card-head"><span class="card-title">成长概览</span></div>' + stats + "</div>" +
      '<div class="card"><div class="card-head"><span class="card-title">过程性评价</span></div><div>' + assessHTML + "</div></div>" +
      '<div class="card" style="grid-column:1/-1"><div class="card-head"><span class="card-title">成绩</span></div><div>' + gradeHTML + "</div></div>" +
      "</div>";
  }
  function growthStat(emo, cls, val, lbl) {
    return '<div class="card stat-card"><div class="icon ' + cls + '">' + emo + '</div><div><div class="val">' + val + '</div><div class="lbl">' + lbl + "</div></div></div>";
  }
  function gradeAvg(grades) {
    if (!grades.length) return "--";
    return (grades.reduce((a, g) => a + (g.score || 0), 0) / grades.length).toFixed(0);
  }
  function gradeMeta(lv) {
    const map = {
      excellent: { label: "优秀", color: "#21B070" },
      good: { label: "良好", color: "#2E8AFF" },
      pass: { label: "合格", color: "#F59E1E" },
      needs_improvement: { label: "待改进", color: "#848FA3" },
    };
    return map[lv] || { label: lv, color: "#848FA3" };
  }
  function dimensionLabel(dim) {
    const map = { participation: "课堂参与", homework: "作业", quiz: "测验", project: "项目", conduct: "品行" };
    return map[dim] || dim;
  }
  function bindGrowthActions() {
    document.querySelectorAll("[data-qassess]").forEach((b) => (b.onclick = () => {
      const d = store.get();
      const a = d.assessment.find((x) => x.id === b.dataset.qassess);
      if (a) askMentor("评价·" + dimensionLabel(a.dimension) + "：" + a.comment, { kind: "assessment", assessment: a });
    }));
  }

  /* ---------- 今日 ---------- */
  function renderToday() {
    const d = store.get();
    const t = todayISO();
    const slots = slotsForDate(t, d).filter((s) => s.kind !== "break");
    const goal = todayGoal(d);
    const minToday = sumFocusMinutes(d, t);
    const focusWins = slots.filter((s) => s.kind === "focus");

    const goalHTML = goal
      ? '<div class="card"><div class="card-head"><span class="card-title">今日目标</span>' + badge(goal.status) + '</div><div class="today-goal"><span class="g-ico">🎯</span><div><b>' + esc(goal.title) + "</b>" + (goal.due_at ? '<div class="text-soft" style="font-size:12.5px">截止 ' + esc(goal.due_at) + "</div>" : "") + "</div></div></div>"
      : "";

    const timeline = slots.length
      ? slots.map((s) => timelineSlotHTML(s)).join("")
      : emptyBox("🌤️", "今天没有排课，自由安排");

    const focusCard =
      '<div class="card"><div class="card-head"><span class="card-title">专注</span><span class="tag accent">今日 ' + formatMin(minToday) + '</span></div>' +
      '<div class="text-soft" style="font-size:13.5px;margin-bottom:12px">今天有 <b>' + focusWins.length + '</b> 个适合专注的时段。</div>' +
      '<button class="btn block" id="startFocus">🎯 开始专注</button></div>';

    view.innerHTML =
      '<div class="page-head"><div><div class="page-title">今日</div><div class="page-sub">' + esc(t) + " · 当日行动</div></div></div>" +
      '<div class="grid grid-2" style="grid-template-columns:' + (goal ? "1fr 300px" : "1fr") + '">' +
      '<div class="card"><div class="card-head"><span class="card-title">课表时间轴</span></div><div>' + timeline + "</div></div>" +
      (goal ? goalHTML + focusCard : focusCard) +
      "</div>";

    const sf = $("#startFocus");
    if (sf) sf.onclick = () => openFocus(45);
    bindSlotActions();
  }
  function timelineSlotHTML(s) {
    const color = s.color || "#4c5fe4";
    const focus = s.kind === "focus";
    return '<div class="timeline-slot"><div class="t-time">' + s.start_at.slice(11, 16) + "</div>" +
      '<div class="t-line" style="background:' + color + '"></div>' +
      '<div class="t-main"><div class="t-title">' + esc(s.title) + (focus ? ' <span class="tag warn">专注</span>' : "") + "</div>" +
      '<div class="t-meta">' + esc(s.teacher || "—") + (s.room ? " · " + esc(s.room) : "") + "</div>" +
      '<div style="margin-top:6px;display:flex;gap:8px">' +
      '<button class="where-btn" data-qslot="' + s.id + '" data-title="' + esc(s.title) + '">🧑‍🏫 问导师</button>' +
      (focus ? '<button class="where-btn" data-focus="' + s.id + '">开始专注</button>' : "") +
      "</div></div></div>";
  }
  function bindSlotActions() {
    document.querySelectorAll("[data-qslot]").forEach((b) => (b.onclick = () => askMentor("课程「" + b.dataset.title + "」", { kind: "slot", title: b.dataset.title })));
    document.querySelectorAll("[data-focus]").forEach((b) => (b.onclick = () => openFocus(45)));
  }
  function todayGoal(d) {
    const pool = d.path.nodes.filter((n) => n.status === "in_progress" && n.type === "short_term_goal");
    if (pool.length) return pool[0];
    const any = d.path.nodes.filter((n) => n.status === "in_progress");
    return any.length ? any[0] : null;
  }
  function sumFocusMinutes(d, dateISO) {
    return d.focusSessions.filter((f) => f.status === "completed" && f.started_at && f.started_at.slice(0, 10) === dateISO).reduce((a, f) => a + f.actual_duration_min, 0);
  }
  function formatMin(min) {
    if (!min) return "0m";
    if (min < 60) return min + "m";
    return Math.floor(min / 60) + "h" + (min % 60 ? pad(min % 60) + "m" : "");
  }

  /* ---------- 导师 ---------- */
  function ensureMentorSeed() {
    const d = store.get();
    if (!d.mentorMessages || !d.mentorMessages.length) {
      d.mentorMessages = [{
        role: "ai", id: uid(), text: "我是你的辅导与建议者。所有规划与调整，决定权永远在你。想聊什么？成绩、路径、今天的日程，或点下方快捷提问。",
      }];
      store.persist();
    }
    return d.mentorMessages;
  }
  function renderMentor() {
    const d = store.get();
    const msgs = ensureMentorSeed();
    const chat = msgs.map((m) => msgHTML(m)).join("");
    const shortcuts = (d.promptShortcuts || []).map((p) => '<button class="chip" data-shot="' + p.id + '">' + esc(p.label) + "</button>").join("");
    view.innerHTML =
      '<div class="page-head"><div><div class="page-title">导师</div><div class="page-sub">受邀导师 · 对话流 + 建议</div></div></div>' +
      '<div class="mentor-banner">我是你的<b>辅导与建议者</b>，所有规划与调整的<b>决定权永远在你</b>。我提供的每条建议都注明依据。</div>' +
      '<div class="card"><div class="chat-box" id="chatBox">' + chat + "</div>" +
      '<div class="chat-input"><div style="display:flex;gap:8px;align-items:center">' +
      '<input id="mentorInput" placeholder="问问你的导师…" />' +
      '<button class="btn mentor" id="mentorSend">发送</button></div></div>' +
      '<div class="prompt-shortcuts">' + shortcuts + "</div></div>";
    bindMentor();
    const box = $("#chatBox"); box.scrollTop = box.scrollHeight;
  }
  function msgHTML(m) {
    if (m.role === "user") return '<div class="chat-msg user"><div class="avatar user">我</div><div class="chat-bubble">' + m.text + "</div></div>";
    let extra = "";
    if (m.reason) extra += '<div class="why"><div class="why-label">💡 为什么这么建议</div>' + m.reason + "</div>";
    if (m.suggestions && m.suggestions.length) extra += m.suggestions.map((s) => sugCardHTML(s)).join("");
    if (m.openQuestions && m.openQuestions.length) extra += '<div class="ob-note"><b>给我的问题：</b> ' + m.openQuestions.map(esc).join("；") + "</div>";
    return '<div class="chat-msg"><div class="avatar mentor">导</div><div class="chat-bubble">' + m.text + "<div>" + extra + "</div></div></div>";
  }
  function sugCardHTML(s) {
    let state = "";
    if (s.status === "pending") state = '<span class="tag warn">暂缓</span>';
    else if (s.status === "declined") state = '<span class="tag muted">不采纳</span>';
    else if (s.status === "accepted") state = '<span class="tag accent">已采纳</span>';
    return '<div class="suggest-card" id="sug-' + s.id + '"><div class="s-text">💡 ' + esc(s.text) + "</div>" +
      (s.reason ? '<div class="s-reason">' + esc(s.reason) + "</div>" : "") +
      '<div class="suggest-actions">' +
      '<button class="btn sm" data-accept="' + s.id + '">采纳并去编辑器落地</button>' +
      '<button class="btn sm ghost" data-defer="' + s.id + '">暂缓</button>' +
      '<button class="btn sm ghost" data-decline="' + s.id + '">不采纳</button>' + state + "</div></div>";
  }
  function bindMentor() {
    const send = $("#mentorSend"), input = $("#mentorInput");
    if (send && input) {
      send.onclick = () => { const v = input.value.trim(); if (v) { sendMentor(v); input.value = ""; } };
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { const v = input.value.trim(); if (v) { sendMentor(v); input.value = ""; } } });
      if (S.activeContextTag) { input.placeholder = "结合「" + S.activeContextTag + "」，继续问…"; }
    }
    document.querySelectorAll("[data-shot]").forEach((b) => (b.onclick = () => sendShortcut(b.dataset.shot)));
    document.querySelectorAll("[data-accept]").forEach((b) => (b.onclick = () => acceptSuggestion(b.dataset.accept)));
    document.querySelectorAll("[data-defer]").forEach((b) => (b.onclick = () => deferSuggestion(b.dataset.defer)));
    document.querySelectorAll("[data-decline]").forEach((b) => (b.onclick = () => declineSuggestion(b.dataset.decline)));
  }
  function appendMessage(m) {
    const d = store.get();
    d.mentorMessages.push(m);
    store.persist();
    const box = $("#chatBox");
    if (box) { box.insertAdjacentHTML("beforeend", msgHTML(m)); box.scrollTop = box.scrollHeight; bindMentor(); }
  }
  function showTyping() {
    const box = $("#chatBox");
    if (!box) return;
    box.insertAdjacentHTML("beforeend", '<div class="chat-msg" id="typingRow"><div class="avatar mentor">导</div><div class="chat-bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div></div>');
    box.scrollTop = box.scrollHeight;
  }
  function hideTyping() {
    const r = $("#typingRow");
    if (r) r.remove();
  }
  function sendMentor(text) {
    appendMessage({ role: "user", id: uid(), text: esc(text) });
    showTyping();
    const ctx = S.activeContextTag;
    setTimeout(() => {
      hideTyping();
      appendMessage(buildAiReply(text, ctx));
    }, 850);
  }
  function sendShortcut(id) {
    const map = {
      plan: "请基于我的人生路径，帮我规划本周的小任务。",
      grade: "帮我分析我的成绩趋势，并给点针对性建议。",
      mentor: "我该往哪个升学方向走？",
      focus: "我今天如何更好地安排专注时间？",
    };
    sendMentor(map[id] || "请给我建议。");
  }
  function buildAiReply(text, ctx) {
    const d = store.get();
    const t = text + (ctx || "");
    if (/成绩|分数|趋势/.test(t)) {
      const avg = gradeAvg(d.grades);
      return { role: "ai", id: uid(), text: "近 " + d.grades.length + " 次考试平均约 <b>" + avg + "</b> 分，整体稳定。可以留意错题分布，复盘时抓失分最集中的点。", reason: "依据你的 Grade[]（已脱敏）做均值与趋势判断。", openQuestions: ["最近哪一科最让你没把握？"] };
    }
    if (/升学|高校|大学|留学|出国|方向/.test(t)) {
      return { role: "ai", id: uid(), text: "升学方向值得慢慢探索。你路径里有一个「待定」节点——完全没问题，先把信息面铺开，再做决定。", reason: "读取自你的 LifePath[]，暂不作倾向性判断。", suggestions: [{ id: uid(), text: "本周加入「探索大学与专业」的小任务", reason: "把大方向拆成可执行小任务，方便你逐步明确，也可能随时待定。", status: null }], openQuestions: ["要不要先了解 3 个不同的专业方向？"] };
    }
    if (/专注|效率|分心|时间/.test(t)) {
      return { role: "ai", id: uid(), text: "今天课表里有适合专注的时段。可以先从 25 分钟开始，结束时记录一条专注会话。", reason: "依据 ScheduleSlot[kind=focus] 与你今日 " + formatMin(sumFocusMinutes(d, todayISO())) + " 分钟专注。", openQuestions: ["现在就开启一段 25 分钟的专注吗？"] };
    }
    return { role: "ai", id: uid(), text: "围绕你的<b>人生路径</b>，我给出如下参考建议。你是否采纳，由你决定；不接受也没关系，我会如实记录。", reason: "上下文取自你的 LifePath[]（已脱敏），仅供你判断。", suggestions: [{ id: uid(), text: "把「" + (d.path.nodes[1] ? d.path.nodes[1].title : "近期目标") + "」细化出一个本周小任务", reason: "把长期目标拆成步骤，更容易落地。", status: null }], openQuestions: ["你更想优先推进哪个目标？"] };
  }
  function acceptSuggestion(id) {
    const d = store.get();
    const sug = findSuggestion(id);
    if (!sug) return;
    sug.status = "accepted";
    store.persist();
    S.draftFromSuggestion = sug;
    setTab(0);
    openNodeEditorFromSuggestion(sug);
    persistToast("已采纳，去「我」的编辑器确认落地", true);
  }
  function deferSuggestion(id) {
    const s = findSuggestion(id); if (!s) return; s.status = "pending";
    store.persist(); updateSugCard(id); persistToast("好的，先暂缓这条建议。", false);
  }
  function declineSuggestion(id) {
    const s = findSuggestion(id); if (!s) return; s.status = "declined";
    store.persist(); updateSugCard(id); persistToast("已记录「不采纳」，未改动任何路径。", false);
  }
  function findSuggestion(id) {
    const d = store.get();
    for (const m of d.mentorMessages || []) if (m.suggestions) { const s = m.suggestions.find((x) => x.id === id); if (s) return s; }
    return null;
  }
  function updateSugCard(id) {
    const d = store.get();
    const el = $("#sug-" + id);
    const s = findSuggestion(id);
    if (el && s) { el.outerHTML = sugCardHTML(s); bindMentor(); }
  }
  function askMentor(contextLabel, ctxObj) {
    S.activeContextTag = contextLabel;
    const d = store.get();
    d.mentorMessages = d.mentorMessages || [];
    ensureMentorSeed();
    setTab(2);
    const text = "请帮我看看「" + contextLabel + "」，给点建议。";
    appendMessage({ role: "user", id: uid(), text: esc(text) });
    showTyping();
    setTimeout(() => { hideTyping(); appendMessage(buildAiReply(text, contextLabel)); }, 850);
  }

  /* ---------- Node editor (user-owned write) ---------- */
  function openNodeEditor(node) {
    S.editingNode = node;
    S.draftFromSuggestion = null;
    const overlay = $("#nodeEditorOverlay");
    overlay.classList.remove("hidden");
    const types = ['<option value="vision">愿景</option><option value="long_term_goal">长期目标</option><option value="short_term_goal">短期目标</option><option value="task">任务</option><option value="interest">兴趣板块</option><option value="note">备注</option>'];
    const statuses = '<option value="in_progress">进行中</option><option value="achieved">已达成</option><option value="pending">待定</option><option value="abandoned">已放弃</option>';
    const t = node || { type: "short_term_goal", title: "", description: "", status: "in_progress", due_at: "" };
    overlay.innerHTML = '<div class="overlay-wrap"><div class="ob-title">' + (node ? "编辑节点" : "添加节点") + "</div>" +
      (S.draftFromSuggestion ? '<div class="ob-desc" style="background:var(--pending-soft);padding:10px 12px;border-radius:10px">此内容来自导师建议（AI 依据 + 标题已预填）。<b>由你在这里亲手确认并保存</b>，才会落地到路径。</div>' : '<div class="ob-desc">写操作只由你发起。状态四态平等，任何位置都可标「待定」。</div>') +
      '<div class="edit-grid"><div class="field"><label>类型</label><select id="edType">' + types.join("") + "</select></div>" +
      '<div class="field"><label>状态</label><select id="edStatus">' + statuses + "</select></div></div>" +
      '<div class="field"><label>标题</label><input id="edTitle" value="' + esc(t.title) + '" placeholder="例如：期末数学提高" /></div>' +
      '<div class="field"><label>描述（可选）</label><textarea id="edDesc" rows="2">' + esc(t.description || "") + "</textarea></div>" +
      '<div class="field"><label>截止日期（可选）</label><input id="edDue" type="date" value="' + esc(t.due_at || "") + '" /></div>' +
      '<div class="ob-actions"><div></div><div style="display:flex;gap:10px"><button class="btn ghost" id="edCancel">取消</button><button class="btn" id="edSave">保存到我的路径</button></div></div></div>';
    $("#edType", overlay).value = t.type || "short_term_goal";
    $("#edStatus", overlay).value = t.status || "in_progress";
    $("#edCancel", overlay).onclick = () => { S.editingNode = null; S.draftFromSuggestion = null; overlay.classList.add("hidden"); };
    $("#edSave", overlay).onclick = saveNodeEditor;
  }
  function openNodeEditorFromSuggestion(sug) {
    const overlay = $("#nodeEditorOverlay");
    overlay.classList.remove("hidden");
    const types = '<option value="short_term_goal">短期目标</option><option value="long_term_goal">长期目标</option><option value="task">任务</option>';
    const statuses = '<option value="in_progress">进行中</option><option value="achieved">已达成</option><option value="pending">待定</option><option value="abandoned">已放弃</option>';
    overlay.innerHTML = '<div class="overlay-wrap"><div class="ob-title">落地导师建议</div>' +
      '<div class="ob-desc" style="background:var(--pending-soft);padding:10px 12px;border-radius:10px">以下已按建议预填（含 AI 依据）。这是<b>你的专属编辑器</b>——确认后点击《保存》，才会写入你的人生路径。</div>' +
      '<div class="edit-grid"><div class="field"><label>类型</label><select id="edType">' + types + '</select></div>' +
      '<div class="field"><label>状态</label><select id="edStatus">' + statuses + "</select></div></div>" +
      '<div class="field"><label>标题</label><input id="edTitle" value="' + esc(sug.text.slice(0, 40).replace(/^💡\s*/, "")) + '" /></div>' +
      '<div class="field"><label>描述（AI 依据，供你参考 / 可改）</label><textarea id="edDesc" rows="2">' + esc(sug.reason || "") + "</textarea></div>" +
      '<div class="field"><label>截止日期（可选）</label><input id="edDue" type="date" /></div>' +
      '<div class="ob-actions"><div></div><div style="display:flex;gap:10px"><button class="btn ghost" id="edCancel">取消 · 不落地</button><button class="btn" id="edSave">保存到我的路径</button></div></div></div>';
    $("#edCancel", overlay).onclick = () => { S.editingNode = null; S.draftFromSuggestion = null; overlay.classList.add("hidden"); };
    $("#edSave", overlay).onclick = saveNodeEditor;
  }
  function saveNodeEditor() {
    const d = store.get();
    const title = $("#edTitle").value.trim();
    if (!title) { toast("标题不能为空", "danger"); return; }
    const fields = { type: $("#edType").value, status: $("#edStatus").value, title, description: $("#edDesc").value.trim(), due_at: $("#edDue").value || null };
    if (S.draftFromSuggestion) {
      d.path.nodes.push(Object.assign({ id: uid(), parent_id: null, completed_at: fields.status === "achieved" ? now() : null, ai_note: S.draftFromSuggestion.reason || null, order: d.path.nodes.length }, fields));
      S.draftFromSuggestion = null;
    } else if (S.editingNode) {
      Object.assign(S.editingNode, fields, { updated_at: now(), completed_at: fields.status === "achieved" ? (S.editingNode.completed_at || now()) : null });
    } else {
      d.path.nodes.push(Object.assign({ id: uid(), parent_id: null, completed_at: fields.status === "achieved" ? now() : null, ai_note: null, order: d.path.nodes.length }, fields));
    }
    store.persist();
    $("#nodeEditorOverlay").classList.add("hidden");
    S.editingNode = null;
    persistToast("已保存到你的路径 ✅", true);
    S.seg = "path";
    setTab(0);
  }

  /* ---------- Focus modal ---------- */
  function openFocus(min) {
    S.focus = { running: true, remaining: min * 60, total: min * 60, timerId: null };
    const overlay = $("#focusOverlay");
    overlay.classList.remove("hidden");
    renderFocusModal();
    S.focus.timerId = setInterval(focusTick, 1000);
  }
  function renderFocusModal() {
    const total = S.focus.total || 45 * 60;
    const remain = S.focus.running ? S.focus.remaining : total;
    const C = 2 * Math.PI * 92;
    const off = C * (1 - remain / total);
    const running = S.focus.running;
    document.getElementById("focusOverlay").innerHTML =
      '<div class="focus-full"><div style="font-size:18px;font-weight:700">🎯 专注模式</div>' +
      '<div class="focus-ring"><svg width="220" height="220"><circle class="ring-bg" cx="110" cy="110" r="92" fill="none" stroke-width="12"/><circle class="ring-fg" cx="110" cy="110" r="92" fill="none" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' + off + '"/></svg><div class="focus-time"><b>' + fmtClock(remain) + '</b><span>' + (S.focus.running ? "专注中" : "暂停") + "</span></div></div>" +
      '<div class="focus-status">' + (running ? "保持专注，屏蔽干扰。" : "已暂停，随时继续。") + "</div>" +
      '<div class="focus-actions">' + (running
        ? '<button class="btn ghost" id="focusPause">⏸ 暂停</button>'
        : '<button class="btn accent" id="focusResume" style="background:var(--achieved)">▶ 继续</button>') +
      '<button class="btn ghost" id="focusEnd">■ 结束</button></div></div>';
    const p = $("#focusPause"); if (p) p.onclick = () => { S.focus.running = false; renderFocusModal(); };
    const r = $("#focusResume"); if (r) r.onclick = () => { S.focus.running = true; renderFocusModal(); };
    const e = $("#focusEnd"); if (e) e.onclick = () => endFocus(false);
  }
  function focusTick() {
    if (!S.focus.running) return;
    S.focus.remaining -= 1;
    if (S.focus.remaining <= 0) { endFocus(true); return; }
    const total = S.focus.total || 1;
    const C = 2 * Math.PI * 92;
    const tEl = $(".focus-ring .focus-time b");
    const fg = $(".focus-ring .ring-fg");
    if (tEl) tEl.textContent = fmtClock(S.focus.remaining);
    if (fg) fg.setAttribute("stroke-dashoffset", C * (1 - S.focus.remaining / total));
  }
  function fmtClock(min) { return pad(Math.floor(min / 60)) + ":" + pad(Math.round(min % 60)); }
  function endFocus(complete) {
    clearInterval(S.focus.timerId);
    const d = store.get();
    const totalMin = Math.round((complete ? S.focus.total : S.focus.total - S.focus.remaining) / 60);
    d.focusSessions.push({ id: uid(), user_id: d.user.id, slot_id: null, started_at: now(), ended_at: now(), planned_duration_min: Math.round(S.focus.total / 60), actual_duration_min: totalMin, status: complete ? "completed" : "aborted" });
    store.persist();
    $("#focusOverlay").classList.add("hidden");
    S.focus.running = false;
    S.focus.timerId = null;
    persistToast(complete ? "专注完成，恭喜！🎉" : "已结束这段专注", complete);
    renderMain();
  }

  /* ---------- Onboarding ------------------------------------------- */
  let ob = { step: 0, interests: [], thought: "", draft: [] };
  const OB_STEPS = 3;
  function openOnboarding() {
    const d = store.get();
    ob = { step: 0, interests: d.user.interests.slice(), thought: "", draft: [] };
    const o = $("#onboardingOverlay");
    o.classList.remove("hidden");
    renderObStep();
  }
  function renderObStep() {
    const o = $("#onboardingOverlay");
    const steps = ["兴趣板块", "人生想法", "路径草案"];
    o.innerHTML = '<div class="overlay-wrap">' +
      '<div class="ob-progress"><div class="bar" style="width:' + ((ob.step) / OB_STEPS) * 100 + '%"></div></div>' +
      '<div class="ob-title" style="text-align:center">' + (ob.step + 1) + ". " + steps[ob.step] + "</div>" +
      '<div class="ob-desc" style="text-align:center">' + obDesc() + "</div>" +
      obStepContent() +
      '<div class="ob-actions">' + (ob.step > 0 ? '<button class="btn ghost" id="obBack">← 上一步</button>' : "<div></div>") +
      (ob.step < OB_STEPS - 1 ? '<button class="btn" id="obNext">下一步 →</button>' : '<button class="btn block" id="obFinish">亲手确认并开启旅程 ✨</button>') + "</div></div>";
    bindOb();
  }
  function obDesc() {
    return ["选择你在意的兴趣板块（可多选）。你选了哪些，我就知道你在意什么。",
      "写下你对人生的想法——哪怕很模糊。AI 不评判，只倾听。",
      "这是 AI 根据你的兴趣与想法整理的路径草案（含「待定」占位）。在最后一步，你会亲手确认。"][ob.step];
  }
  function obStepContent() {
    if (ob.step === 0) {
      const grid = INTERESTS.map((i) => '<button class="interest-card' + (ob.interests.includes(i.slug) ? " selected" : "") + '" data-is="' + i.slug + '"><span class="emo">' + i.emoji + "</span>" + i.label + "</button>").join("");
      return '<div class="interest-grid">' + grid + "</div>";
    }
    if (ob.step === 1) return '<textarea id="obThought" rows="6" style="width:100%;border:1px solid var(--line);border-radius:12px;padding:14px" placeholder="例如：我想做点有实际影响的事，但方向还不确定……">' + esc(ob.thought) + "</textarea>";
    return '<div class="ob-note" style="margin-top:0;background:var(--oxford-soft);color:var(--oxford)">以下为 AI 建议草稿，不代表你的最终路径。没想好的节点标为「待定」。</div>' +
      (ob.draft.map((n, i) => '<div class="draft-node"><div class="dn-main"><div class="dn-type">' + esc(typeLabel[n.type] || n.type) + (n.status === "pending" ? ' · <span class="tag warn">待定</span>' : "") + '</div><div class="dn-title">' + esc(n.title) + "</div></div><div class='dn-actions'><button class='btn sm ghost' data-up=" + i + ">↑</button><button class='btn sm ghost' data-down=" + i + ">↓</button></div></div>").join(""));
  }
  function bindOb() {
    if (ob.step === 0) {
      document.querySelectorAll("[data-is]").forEach((b) => (b.onclick = () => {
        const s = b.dataset.is;
        const ix = ob.interests.indexOf(s);
        if (ix >= 0) ob.interests.splice(ix, 1); else ob.interests.push(s);
        b.classList.toggle("selected");
      }));
    }
    if (ob.step === 1) {
      const ta = $("#obThought");
      if (ta) ta.addEventListener("input", (e) => (ob.thought = e.target.value));
    }
    if (ob.step === 2) {
      document.querySelectorAll("[data-up]").forEach((b) => (b.onclick = () => obMove(+b.dataset.up, -1)));
      document.querySelectorAll("[data-down]").forEach((b) => (b.onclick = () => obMove(+b.dataset.down, +1)));
    }
    const back = $("#obBack"); if (back) back.onclick = () => { ob.step--; renderObStep(); };
    const next = $("#obNext"); if (next) next.onclick = () => { if (ob.step === 1) generateDraft(); ob.step++; renderObStep(); };
    const finish = $("#obFinish"); if (finish) finish.onclick = finishOnboarding;
  }
  function obMove(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= ob.draft.length) return;
    const tmp = ob.draft[i]; ob.draft[i] = ob.draft[j]; ob.draft[j] = tmp;
    renderObStep();
  }
  function generateDraft() {
    const drafts = [];
    const vt = (ob.thought || "成为能解决真实问题的人").slice(0, 24).replace(/[。，.!?`·]/g, "");
    drafts.push({ type: "vision", title: vt || "成为更好的自己", status: "in_progress" });
    drafts.push({ type: "long_term_goal", title: "高三前完成一个有影响的项目", status: "in_progress" });
    ob.interests.forEach((sl) => {
      const i = INTERESTS.find((x) => x.slug === sl);
      if (i) drafts.push({ type: "interest", title: i.label + "·兴趣板块", status: "in_progress" });
    });
    drafts.push({ type: "short_term_goal", title: "期末选定一个方向课题", status: "pending" });
    drafts.push({ type: "long_term_goal", title: "升学方向：待定", status: "pending" });
    ob.draft = (ob.draft && ob.draft.length) ? ob.draft : drafts;
  }
  function finishOnboarding() {
    const d = store.get();
    if (!ob.draft.length) generateDraft();
    d.path.nodes = ob.draft.map((n, i) => ({ id: uid(), parent_id: null, type: n.type, title: n.title, description: "", status: n.status, created_at: now(), updated_at: now(), order: i, source: "user", due_at: null, completed_at: n.status === "achieved" ? now() : null, ai_note: null }));
    d.user.interests = ob.interests.slice();
    d.isOnboardingCompleted = true;
    store.persist();
    $("#onboardingOverlay").classList.add("hidden");
    S.seg = "path";
    setTab(0);
    persistToast("🎉 欢迎！你的人生路径档案已就绪。", true);
  }

  /* ---------- Init ---------- */
  function init() {
    renderShell();
    const d = store.get();
    if (!d.isOnboardingCompleted) { openOnboarding(); return; }
    setTab(0);
  }
  window.addEventListener("DOMContentLoaded", init);
})();
