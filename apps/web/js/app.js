/* ============================================================
 * 十一校园助手 · BNDS Campus Companion
 * app.js — 路由 + 五大模块渲染 + Onboarding 共创向导
 * 原则：AI 是导师不是决策者；待定是常态；建议可拒绝；透明可溯源。
 * ============================================================ */

(function () {
  const { store, INTERESTS, uid, now, todayISO, isoDay, pad, addDays, startOfWeek, slotsForDate, weekParityFor, COURSE_COLORS } = BNDS;

  const state = {
    route: "dashboard",
    weekStart: startOfWeek(todayISO()),
    focus: { session: null, timerId: null, remaining: 0, total: 0 },
    mentor: { messages: [] },
  };

  /* ---------- DOM helpers ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const view = $("#view");
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  let toastTimer = null;
  function toast(msg, type) {
    const el = $("#toast");
    el.textContent = msg;
    el.className = "toast" + (type ? " " + type : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add("hidden"), 2400);
  }
  function err(msg) { toast(msg, "danger"); }

  /* ============================================================
   * 路由
   * ============================================================ */
  function navigate(route) {
    state.route = route;
    setNav(route);
    const map = {
      dashboard: renderDashboard,
      schedule: renderSchedule,
      focus: renderFocus,
      mentor: renderMentor,
      "life-path": renderLifePath,
      onboarding: renderOnboarding,
      home: renderDashboard,
    };
    (map[route] || renderDashboard)();
    window.scrollTo({ top: 0 });
    closeSidebar();
  }
  function setNav(route) {
    document.querySelectorAll(".nav-link").forEach((a) => {
      a.classList.toggle("active", a.dataset.route === route);
    });
  }

  function renderShell() {
    const d = store.get();
    $("#topbarUser").textContent = d.user.name + " · 高一";
    $("#sidebarFoot").innerHTML =
      '<div class="foot-line"><span>数据来源</span><span class="tag">Mock</span></div>' +
      '<div class="foot-line"><span>AI 边界</span><span class="tag accent">只建议</span></div>' +
      '<div class="foot-line"><span style="margin-top:6px">🧭 决策权永远在人</span></div>';
  }

  function openSidebar() { $("#sidebar").classList.add("open"); $("#backdrop").classList.add("show"); }
  function closeSidebar() { $("#sidebar").classList.remove("open"); $("#backdrop").classList.remove("show"); }
  function bindSidebar() {
    $("#menuBtn").addEventListener("click", openSidebar);
    $("#backdrop").addEventListener("click", closeSidebar);
    document.querySelectorAll(".nav-link").forEach((a) => a.addEventListener("click", () => navigate(a.dataset.route)));
  }

  /* ============================================================
   * 1. Dashboard 概览
   * ============================================================ */
  function todayCourses(slots) {
    return slots.filter((s) => s.kind !== "break");
  }
  function pathStats(path) {
    const nodes = path.nodes;
    return {
      total: nodes.length,
      achieved: nodes.filter((n) => n.status === "achieved").length,
      inProgress: nodes.filter((n) => n.status === "in_progress").length,
      pending: nodes.filter((n) => n.status === "pending").length,
    };
  }
  function gradeAvg(grades) {
    if (!grades.length) return "--";
    const avg = grades.reduce((a, g) => a + (g.score || 0), 0) / grades.length;
    return avg.toFixed(0);
  }
  function renderDashboard() {
    const d = store.get();
    const t = todayISO();
    const slots = slotsForDate(t, d);
    const todayCourses = slots.filter((s) => s.kind !== "break");
    const ps = pathStats(d.path);
    const avg = gradeAvg(d.grades);
    const minutesToday = sumFocusToday(d, t);

    const next = todayCourses[0] || null;
    const h = "<div class='hero'>" +
      "<div><h1>早上好，" + esc(d.user.name) + " 👋</h1><p>" +
        (next ? "下一节课：<b>" + esc(next.title) + "</b> " + esc(next.room || "") + " · " + esc(next.start_at.slice(11, 16)) : "今天没有课程，自由安排") +
      "</p></div>" +
      "<button class='btn hero-action' data-go='focus'>开始专注 →</button></div>";

    const stats =
      '<div class="grid grid-4">' +
      statCard("今日课程", String(todayCourses.length), "节", upClass("")) +
      statCard("本周专注", formatMin(minutesToday), "今天", upClass("<span>已打卡</span>")) +
      statCard("平均成绩", String(avg), "分", upClass("稳中有升")) +
      statCard("路径进度", ps.achieved + "/" + ps.total, "已达成", upClass(Math.round((ps.achieved / (ps.total || 1)) * 100) + "%")) +
      "</div>";

    const courseList = todayCourses.length
      ? todayCourses.map((s) => "<div class='slot-card'><div class='slot-time'>" + s.start_at.slice(11, 16) + "–" + s.end_at.slice(11, 16) + "</div><div class='slot-title'>" + esc(s.title) +
          "</div><div class='slot-meta'>" + esc(s.teacher || "—") + " · " + esc(s.room || "—") + "</div></div>").join("")
      : emptyBox("📭", "今天暂无课程");

    const pathBox = d.path.nodes.length
      ? d.path.nodes.slice(0, 4).map((n) => nodeRow(n)).join("")
      : emptyBox("🧭", "还没有人生路径，去共创一条吧");

    const aiNote = buildAiNote(d);

    view.innerHTML =
      '<div class="page-head"><div><div class="page-title">概览 Dashboard</div><div class="page-sub">把散落的信息，收束到一个入口 · ' + esc(t) + "</div></div></div>" +
      h +
      stats +
      '<div class="grid grid-2 mt">' +
        '<div class="card"><div class="card-head"><span class="card-title">今日课表</span><a class="btn ghost sm" href="#/schedule">查看全部</a></div>' + courseList + "</div>" +
        '<div class="card"><div class="card-head"><span class="card-title">人生路径</span><a class="btn ghost sm" href="#/life-path">打开</a></div>' + pathBox + "</div>" +
      "</div>" +
      '<div class="card mt"><div class="card-head"><span class="card-title">AI 导师 · 今日提醒 <span class="tag accent">只建议 · 你来拍板</span></span></div>' + aiNote + "</div>";

    bindDataGo();
  }

  function statCard(label, value, unit, trend) {
    return "<div class='card stat-card'><div class='stat-label'>" + label + '</div><div class="stat-value">' + value + ' <span style="font-size:15px;font-weight:600;color:var(--text-soft)">' + unit + "</span></div><div class='stat-trend " + (trend.startsWith("up") ? "up" : "") + "'>" + trend + "</div></div>";
  }
  function upClass(s) { return s; }
  function formatMin(min) {
    if (!min) return "0m";
    if (min < 60) return min + "m";
    const hh = Math.floor(min / 60);
    const mm = min % 60;
    return hh + "h" + (mm ? pad(mm) + "m" : "");
  }
  function sumFocusToday(d, dateISO) {
    return d.focusSessions.filter((f) => f.status === "completed" && f.started_at && f.started_at.slice(0, 10) === dateISO).reduce((a, f) => a + f.actual_duration_min, 0);
  }
  function nodeRow(n) {
    const st = statusMeta(n.status);
    return "<div style='display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)'><span>" + st.done + "</span><div style='flex:1'><div style='font-weight:600;font-size:14px'>" + esc(n.title) + "</div><div class='text-soft' style='font-size:12px'>" + esc(n.description || typeLabel(n.type)) + "</div></div><span class='tag " + st.cls + "'>" + st.label + "</span></div>";
  }
  function buildAiNote(d) {
    const ps = pathStats(d.path);
    let tips = [];
    if (ps.pending > 0) tips.push("你有 " + ps.pending + " 个「待定」节点。人生方向可以待定，这里不强求补全，等你想好了再看。");
    const focusToday = sumFocusToday(d, todayISO());
    if (focusToday < 60) tips.push("今天专注已达 " + focusToday + " 分钟，是否需要再安排一个番茄钟？");
    const last = d.assessment[0];
    if (last) tips.push("最近评价《" + esc(last.comment) + "》—— 已是对你的肯定。");
    if (d.path.nodes.some((n) => n.type === "short_term_goal" && n.due_at && n.due_at < todayISO() && n.status !== "achieved"))
      tips.push("有个短期目标到期了，可以回顾一下，或把它改成「待定」。");
    const items = tips.slice(0, 3).map((t) => "<li>" + t + "</li>").join("");
    return "<ul style='line-height:1.9;padding-left:18px'>" + (items || "<li>观察中，暂无特别提醒。</li>") + "</ul>" +
      '<div class="ob-note" style="background:var(--primary-soft);color:var(--primary)">以上只是建议。你可以直接说“不”，也可以推翻、待定或修改自己的路径。</div>';
  }

  /* ============================================================
   * 2. Schedule 日程课表
   * ============================================================ */
  function renderSchedule() {
    const d = store.get();
    const days = buildWeek(d, state.weekStart);
    const weekLabel = state.weekStart.slice(5, 7) + "/" + state.weekStart.slice(8) + " – " + isoDay(new Date(new Date(state.weekStart).getTime() + 6 * 86400000)).slice(5);
    const params = weekParityFor(state.weekStart) === "odd" ? "单周" : "双周";
    const cols = days.map((day) => schedCol(day)).join("");
    view.innerHTML =
      '<div class="page-head"><div><div class="page-title">日程课表</div><div class="page-sub">统一课表 · ' + esc(params) + " · " + esc(weekLabel) + "</div></div>" +
      '<div class="week-toolbar"><button class="btn ghost" id="prevWeek">← 上一周</button><button class="btn ghost" id="nextWeek">下一周 →</button><button class="btn ghost" id="todayWeek">回到本周</button></div></div>" +
      '<div class="sched-grid">' + cols + "</div>" +
      '<div class="mt text-faint" style="font-size:12.5px">💡 课表来自「云平台 / ManageBac / 手动」合并（Mock）。专注段会自动标出，用于「专注模式」。</div>';
    $("#prevWeek").onclick = () => { state.weekStart = addDays(state.weekStart, -7); renderSchedule(); };
    $("#nextWeek").onclick = () => { state.weekStart = addDays(state.weekStart, 7); renderSchedule(); };
    $("#todayWeek").onclick = () => { state.weekStart = startOfWeek(todayISO()); renderSchedule(); };
  }
  function buildWeek(d, weekStart) {
    const out = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      out.push({ date, slots: slotsForDate(date, d) });
    }
    return out;
  }
  function schedCol(day) {
    const t = todayISO();
    const isToday = day.date === t;
    const slotsHTML = day.slots.length
      ? day.slots.map((s) => slotCard(s)).join("")
      : "<div class='empty' style='padding:20px 6px'><div style='font-size:20px'>🌸</div></div>";
    const dowName = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][new Date(day.date + "T00:00:00").getDay()];
    return "<div class='sched-col" + (isToday ? " today" : "") + "'><div class='sched-col-head'><span class='day-name'>" + dowName + "</span><span class='day-num'>" + day.date.slice(5).replace("-", "/") + (isToday ? " · 今" : "") + "</span></div>" + slotsHTML + "</div>";
  }
  function slotCard(s) {
    const style = s.color ? "border-left-color:" + s.color : "";
    return "<div class='slot-card " + s.kind + "' style='" + style + "'><div class='slot-time'>" + s.start_at.slice(11, 16) + "–" + s.end_at.slice(11, 16) + "</div><div class='slot-title'>" + esc(s.title) + "</div><div class='slot-meta'>" + esc(s.room || "—") + "</div></div>";
  }

  /* ============================================================
   * 3. Focus 专注模式
   * ============================================================ */
  function renderFocus() {
    const d = store.get();
    const windows = slotsForDate(todayISO(), d).filter((s) => s.kind === "focus");
    const t = todayISO();
    const sessionsToday = d.focusSessions.filter((f) => f.started_at && f.started_at.slice(0, 10) === t);
    const completed = sessionsToday.filter((f) => f.status === "completed");
    const minutes = completed.reduce((a, f) => a + f.actual_duration_min, 0);

    const autoWindows = windows.length
      ? windows.map((w) => "<div class='slot-card focus'><div class='slot-time'>" + w.start_at.slice(11, 16) + "–" + w.end_at.slice(11, 16) + "</div><div class='slot-title'>🟢 " + esc(w.title) + "</div><div class='slot-meta'>建议专注时段</div></div>").join("")
      : emptyBox("✨", "今天没有安排为专注时段的课程，可手动开始");

    const sessionsHTML = d.focusSessions.length
      ? d.focusSessions.slice(-6).reverse().map((f) => {
          const st = f.status === "completed" ? "<span class='tag accent'>已完成</span>" : f.status === "running" ? "<span class='tag primary'>进行中</span>" : "<span class='tag warn'>中止</span>";
          return "<div class='focus-list-item'><div><div style='font-weight:600'>" + (f.started_at ? f.started_at.slice(5, 16).replace("T", " ") : "—") + "</div><div class='text-faint' style='font-size:12px'>计划 " + f.planned_duration_min + " min</div></div><div style='text-align:right;display:flex;align-items:center;gap:10px'>" + (f.actual_duration_min ? "<b>" + f.actual_duration_min + "min</b>" : "") + st + "</div></div>";
        }).join("")
      : emptyBox("🎯", "还没有专注记录");

    view.innerHTML =
      '<div class="page-head"><div><div class="page-title">专注模式</div><div class="page-sub">基于课表的专注时段 · 屏蔽干扰，也尊重你的界限</div></div></div>' +
      '<div class="grid grid-2">' +
        '<div class="card focus-timer-wrap">' + focusRing() + '<div class="focus-status" id="focusStatus">' + focusStatusText() + "</div><div class='focus-actions' id='focusActions'>" + focusActionsHTML() + "</div></div>" +
        '<div class="card"><div class="card-head"><span class="card-title">今天建议的专注时段</span><span class="tag accent">已专注 " + formatMin(minutes) + "</span></div>" + autoWindows + "</div>" +
      "</div>" +
      '<div class="card mt"><div class="card-head"><span class="card-title">专注记录</span></div>' + sessionsHTML + "</div>";

    bindFocus();
  }
  function focusRing() {
    const total = state.focus.total || 45;
    const remain = state.focus.session ? state.focus.remaining : total;
    const pct = state.focus.session ? (remain / total) * 100 : 100;
    const C = 2 * Math.PI * 88;
    const off = C * (1 - pct / 100);
    return '<div class="focus-ring"><svg width="200" height="200"><circle class="ring-bg" cx="100" cy="100" r="88" fill="none" stroke-width="12"/><circle class="ring-fg" cx="100" cy="100" r="88" fill="none" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' + off + '"/></svg><div class="focus-time"><b>' + fmtClock(state.focus.session ? state.focus.remaining : total) + '</b><span>' + (state.focus.session ? "剩余" : "所选时长") + "</span></div></div>";
  }
  function fmtClock(min) {
    const m = Math.floor(min / 60);
    const s = min % 60;
    return pad(m) + ":" + pad(s);
  }
  function focusStatusText() {
    if (state.focus.session) return state.focus.session.status === "running" ? "专注进行中 · " + state.focus.session.title : "已暂停";
    return "准备开始一段专注（默认 45 分钟）";
  }
  function focusActionsHTML() {
    if (state.focus.session) {
      return state.focus.session.status === "running"
        ? "<button class='btn ghost' id='pauseFocus'>⏸ 暂停</button><button class='btn danger' id='stopFocus'>■ 结束</button>"
        : "<button class='btn accent' id='resumeFocus'>▶ 继续</button><button class='btn danger' id='stopFocus'>■ 结束</button>";
    }
    return '<button class="btn accent" data-min="25">25 分钟</button><button class="btn accent" data-min="45">45 分钟</button><button class="btn accent" data-min="60">60 分钟</button>';
  }
  function bindFocus() {
    const actions = $("#focusActions");
    if (!actions) return;
    actions.querySelectorAll("button[data-min]").forEach((b) => {
      b.onclick = () => startFocus(parseInt(b.dataset.min, 10));
    });
    const pause = $("#pauseFocus"); if (pause) pause.onclick = pauseFocus;
    const resume = $("#resumeFocus"); if (resume) resume.onclick = resumeFocus;
    const stop = $("#stopFocus"); if (stop) stop.onclick = stopFocus;
  }
  function startFocus(min) {
    const d = store.get();
    const session = { id: uid(), user_id: d.user.id, slot_id: null, started_at: now(), ended_at: null, planned_duration_min: min, actual_duration_min: 0, status: "running", title: "手动专注" };
    d.focusSessions.push(session);
    store.persist();
    state.focus.session = session;
    state.focus.total = min * 60;
    state.focus.remaining = min * 60;
    renderFocus();
    toast("专注开始，加油！", "ok");
  }
  function tick() {
    if (!state.focus.session || state.focus.session.status !== "running") return;
    state.focus.remaining -= 1;
    if (state.focus.remaining <= 0) { stopFocus(true); return; }
    refreshFocusUI();
  }
  /* refreshFocusUI updates in place to avoid resetting timer */
  function refreshFocusUI() {
    const timeEl = $(".focus-ring .focus-time b");
    const ringFg = $(".focus-ring .ring-fg");
    const status = $("#focusStatus");
    if (timeEl) timeEl.textContent = fmtClock(state.focus.remaining);
    if (ringFg) {
      const total = state.focus.total || 1;
      const C = 2 * Math.PI * 88;
      ringFg.setAttribute("stroke-dashoffset", C * (1 - state.focus.remaining / total));
    }
    if (status) status.textContent = focusStatusText();
  }
  function pauseFocus() {
    if (state.focus.session) {
      state.focus.session.status = "paused";
      toast("已暂停，稍后继续");
      renderFocus();
    }
  }
  function resumeFocus() {
    if (state.focus.session) {
      state.focus.session.status = "running";
      renderFocus();
    }
  }
  function stopFocus(complete) {
    if (!state.focus.session) return;
    const d = store.get();
    const s = state.focus.session;
    const elapsed = (complete ? state.focus.total : state.focus.total - state.focus.remaining) / 60;
    s.ended_at = now();
    s.actual_duration_min = Math.round(elapsed);
    s.status = complete ? "completed" : "aborted";
    const found = d.focusSessions.find((f) => f.id === s.id);
    if (found) { found.ended_at = s.ended_at; found.actual_duration_min = s.actual_duration_min; found.status = s.status; }
    store.persist();
    if (state.focus.timerId) { clearInterval(state.focus.timerId); state.focus.timerId = null; }
    state.focus.session = null;
    renderFocus();
    toast(complete ? "专注完成，恭喜！🎉" : "已中止本次专注", complete ? "ok" : "warn");
  }
  /* keep timer running across re-renders */
  function ensureTimer() {
    if (state.focus.timerId) return;
    state.focus.timerId = setInterval(tick, 1000);
  }

  /* ============================================================
   * 4. Mentor AI 辅导
   *   AI 返回建议 + reason + open_questions；decision_required 恒不为“由AI决定”。
   * ============================================================ */
  function renderMentor() {
    const d = store.get();
    const msgs = state.mentor.messages;
    if (!msgs.length) {
      msgs.push({ role: "ai", text: "你好，我是你的校园 AI 导师。我只做分析与建议，<b>决定权永远在你</b>。想从哪方面聊聊？比如：期末考试规划、学习方法、进程评价、或者你的人生路径。" });
    }
    const msgHTML = msgs.map((m) => mentorMsgHTML(m)).join("");
    view.innerHTML =
      '<div class="page-head"><div><div class="page-title">AI 辅导 <span class="tag accent">导师不决策</span></div><div class="page-sub">上下文以你的「人生路径」为主轴 · 数据已脱敏</div></div></div>' +
      '<div class="card"><div class="chat-box" id="chatBox">' + msgHTML + '</div><div class="chat-input" id="chatInputRow">' +
      '<input id="mentorInput" placeholder="说说你的想法 / 问一个问题…" />' +
      '<button class="btn" id="mentorSend">发送</button></div></div>' +
      '<div class="mt text-faint" style="font-size:12.5px">ⓘ AI 返回的建议永不改变你的路径状态；采纳/拒绝由你决定，并会记录。</div>';
    bindMentor();
    const box = $("#chatBox"); box.scrollTop = box.scrollHeight;
  }
  function mentorMsgHTML(m) {
    if (m.role === "user") return '<div class="chat-msg user"><div class="chat-bubble">' + m.text + "</div></div>";
    let extra = "";
    if (m.reason) extra = '<div class="reason"><div class="why">【为什么这么建议】</div>' + m.reason + "</div>";
    if (m.suggestions) {
      extra += m.suggestions.map((s) =>
        '<div class="suggest-box"><div class="suggest-text">💡 ' + s.text + '</div>' +
        (s.reason ? '<div class="suggest-reason">' + s.reason + "</div>" : "") +
        '<div class="suggest-actions"><button class="btn sm violet" data-accept="' + s.id + '">采纳（转为我的节点）</button><button class="btn sm ghost" data-reject="' + s.id + '">这不是我想要的</button></div></div>'
      ).join("");
    }
    if (m.openQuestions && m.openQuestions.length) extra += '<div class="ob-note" style="margin-top:10px"><b>给我的问题：</b> ' + m.openQuestions.map(esc).join("；") + "</div>";
    return '<div class="chat-msg"><div class="avatar">AI</div><div class="chat-bubble">' + m.text + extra + "</div></div>";
  }
  function bindMentor() {
    const send = $("#mentorSend"), input = $("#mentorInput");
    send.onclick = () => { const v = input.value.trim(); if (v) { sendMentor(v); input.value = ""; } };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { const v = input.value.trim(); if (v) { sendMentor(v); input.value = ""; } } });
    document.querySelectorAll("[data-accept]").forEach((b) => (b.onclick = () => acceptSuggestion(b.dataset.accept)));
    document.querySelectorAll("[data-reject]").forEach((b) => (b.onclick = () => rejectSuggestion(b.dataset.reject)));
  }
  function mentorAppend(m) {
    state.mentor.messages.push(m);
    const box = $("#chatBox");
    if (box) { box.insertAdjacentHTML("beforeend", mentorMsgHTML(m)); box.scrollTop = box.scrollHeight; bindMentor(); }
  }
  function sendMentor(text) {
    mentorAppend({ role: "user", text: esc(text) });
    // typing indicator
    const box = $("#chatBox");
    box.insertAdjacentHTML("beforeend", '<div class="chat-msg"><div class="avatar">AI</div><div class="chat-bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div></div>');
    box.scrollTop = box.scrollHeight;
    setTimeout(() => {
      box.querySelector(".typing-dots") && box.querySelector(".typing-dots").closest(".chat-msg").remove();
      const reply = aiReply(text);
      mentorAppend({ role: "ai", text: reply.text, reason: reply.reason, suggestions: reply.suggestions, openQuestions: reply.openQuestions });
    }, 900);
  }
  function aiReply(text) {
    const d = store.get();
    const asData = midScore(d);
    const t = text.toLowerCase();
    if (/成绩|考试|分数|月考/.test(t)) {
      return {
        text: "你在近三次考试中的平均分约在 <b>" + midScore(d).avg + "</b>，波动不大。可以定期回顾错题的分布。",
        reason: "我依据你的成绩记录（data-model 的 Grade[]）做了均值分析，仅供你参考。",
        openQuestions: ["最近哪一科让你最没把握？"],
      };
    }
    if (/高考|大学|升学|留学|出国/.test(t)) {
      return {
        text: "升学方向可以慢慢探索。你目前的人生路径里有一个「走读：出国留学」节点，标为<b>待定</b>——这完全没问题。",
        reason: "我从你的人生路径里读到该节点，暂不作倾向性判断。",
        openQuestions: ["要不要先把「待定」换成一个具体的探索小任务？"],
      };
    }
    if (/专注|效率|分心|自习/.test(t)) {
      return {
        text: "今天的课表里有若干专注时段（社团/晚自习已标为 focus）。建议挑一个开启专注模式，先从 25 分钟开始。",
        reason: "基于 ScheduleSlot[kind=focus] 与你的专注历史（今天约 " + sumFocusToday(d, todayISO()) + " 分钟）。",
        openQuestions: ["现在就开始一段 25 分钟的专注吗？"],
      };
    }
    // default: general mentor reply with a suggestion based on path
    const sug = {
      id: uid(),
      text: "可以考虑给「" + (d.path.nodes[1] ? d.path.nodes[1].title : "你的短期目标") + "」安排一个本周的具体小任务。",
      reason: "把长期目标拆成可执行的任务，更容易落地；你可以接受，也可以说“不”。",
    };
    return {
      text: "收到。我围绕你的<b>人生路径</b>给出一条参考建议。你可以采纳为节点，也可以直接拒绝，我尊重你的选择。",
      reason: "上下文取自你的 LifePathNode[]（已脱敏）。这只是建议稿，需你确认后才落地。",
      suggestions: [sug],
      openQuestions: ["你想优先推进哪一个目标？"],
    };
  }
  function midScore(d) {
    const gs = d.grades;
    if (!gs.length) return { avg: "--" };
    return { avg: (gs.reduce((a, g) => a + (g.score || 0), 0) / gs.length).toFixed(0) };
  }
  function acceptSuggestion(id) {
    const d = store.get();
    // find the latest ai suggestion by id in messages
    let found = null;
    for (const m of state.mentor.messages) {
      if (m.suggestions) { const s = m.suggestions.find((x) => x.id === id); if (s) { found = s; break; } }
    }
    if (!found) return;
    const node = makePathNode({ type: "short_term_goal", title: found.text.slice(0, 30).replace(/^💡\s*/, ""), description: found.text, status: "in_progress", source: "user", ai_note: found.reason || "" });
    d.path.nodes.push(node);
    store.persist();
    removeSuggestBox(id);
    managerToast("已采纳，写入你的「人生路径」✅", "ok");
  }
  function rejectSuggestion(id) {
    removeSuggestBox(id);
    managerToast("好的，这条建议已被驳回。你随时可以推翻它。", "warn");
    // record the decision
    const d = store.get();
    d.mentorHistory = d.mentorHistory || [];
    d.mentorHistory.push({ id: uid(), decision: "rejected", suggestion_id: id, at: now() });
    store.persist();
  }
  function removeSuggestBox(id) {
    const box = document.querySelector('[data-accept="' + id + '"]');
    if (box) box.closest(".suggest-box").remove();
  }
  function managerToast(m, t) { toast(m, t); }

  function makePathNode(o) {
    const base = { id: uid(), parent_id: null, description: "", start_at: null, due_at: null, completed_at: null, ai_note: null, order: 999, source: "user" };
    return Object.assign(base, o);
  }

  /* ============================================================
   * 5. Life Path 人生路径
   * ============================================================ */
  function renderLifePath() {
    const d = store.get();
    const p = d.path;
    const ps = pathStats(p);
    const nodesHTML = p.nodes.length
      ? p.nodes.sort((a, b) => (a.order || 0) - (b.order || 0)).map((n) => pathNodeHTML(n)).join("")
      : emptyBox("🧭", "还没有节点，去 Onboarding 共创一条吧");
    view.innerHTML =
      '<div class="page-head"><div><div class="page-title">人生路径</div><div class="page-sub">可折叠、可变化 · 决策权永远在你</div></div>' +
      '<button class="btn" id="addNodeBtn">+ 添加节点</button></div>' +
      '<div class="card"><div class="path-title-row"><span class="brand-mark">PATH</span><b style="font-size:17px">' + esc(p.title) + '</b>' +
      '<span class="tag">进行中 ' + ps.inProgress + '</span><span class="tag accent">已达成 ' + ps.achieved + '</span><span class="tag warn">待定 ' + ps.pending + "</span></div>" +
      '<div class="timeline">' + nodesHTML + "</div></div>" +
      '<div class="ob-note">🫵 这是你的路径。任何节点都可以改为「待定」、暂停或推翻 —— 人生充满未知，AI 只是帮你梳理。</div>';
    const add = $("#addNodeBtn"); if (add) add.onclick = openAddNodeModal;
    bindPathNodeActions();
  }
  function pathNodeHTML(n) {
    const st = statusMeta(n.status);
    const typeTag = typeLabel(n.type);
    return '<div class="node-item ' + n.status + '"><div class="node-card">' +
      '<div class="node-type">' + esc(typeTag) + (n.source === "ai_suggest" ? ' <span class="tag violet">AI 建议稿</span>' : "") + "</div>" +
      '<div class="node-title">' + esc(n.title) + "</div>" +
      (n.description ? '<div class="node-desc">' + esc(n.description) + "</div>" : "") +
      (n.ai_note ? '<div class="node-foot"><span class="note">AI：' + esc(n.ai_note) + "</span></div>" : "") +
      '<div class="node-foot"><span class="tag ' + st.cls + '">' + st.label + "</span>" +
      (n.due_at ? '<span class="text-faint" style="font-size:11.5px">截止 ' + esc(n.due_at) + "</span>" : "") +
      '<span style="margin-left:auto;display:flex;gap:6px">' +
      statusBtn(n.id, "achieved", "✓ 达成") + statusBtn(n.id, "pending", "待定") + statusBtn(n.id, "abandoned", "放弃") +
      '<button class="btn sm ghost" data-del="' + n.id + '">删除</button></span></div></div></div>';
  }
  function statusBtn(id, statusTo, label) {
    const st = statusMeta(statusTo);
    return '<button class="btn sm ghost" data-status="' + statusTo + '" data-id="' + id + '" style="color:' + (statusTo === "achieved" ? "var(--accent)" : statusTo === "pending" ? "var(--warn)" : "var(--danger)") + '">' + label + "</button>";
  }
  function bindPathNodeActions() {
    document.querySelectorAll("[data-status]").forEach((b) => (b.onclick = () => setNodeStatus(b.dataset.id, b.dataset.status)));
    document.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => delNode(b.dataset.del)));
  }
  function setNodeStatus(id, statusTo) {
    const d = store.get();
    const n = d.path.nodes.find((x) => x.id === id);
    if (!n) return;
    n.status = statusTo; // 永远由用户操作
    if (statusTo === "achieved") n.completed_at = now();
    n.updated_at = now();
    store.persist();
    managerToast("节点状态已更新（由你决定）", "ok");
    renderLifePath();
  }
  function delNode(id) {
    const d = store.get();
    d.path.nodes = d.path.nodes.filter((x) => x.id !== id);
    store.persist();
    managerToast("已删除节点", "warn");
    renderLifePath();
  }
  function openAddNodeModal() {
    const types = ['<option value="vision">愿景 vision</option><option value="long_term_goal">长期目标</option><option value="short_term_goal">短期目标</option><option value="task">任务</option><option value="interest">兴趣板块</option><option value="note">备注</option>'];
    const html = '<div class="onboarding-overlay"><div class="onboarding-wrap"><div class="ob-title">+ 添加节点</div>' +
      '<div class="ob-block"><div class="field"><label>类型</label><select id="ndType">' + types.join("") + "</select></div>" +
      '<div class="field"><label>标题</label><input id="ndTitle" placeholder="例如：期末数学提高" /></div>' +
      '<div class="field"><label>描述（可选）</label><textarea id="ndDesc" rows="2"></textarea></div>' +
      '<div class="field"><label>截止日期（可选）</label><input id="ndDue" type="date" /></div>' +
      '<div class="ob-actions"><div><button class="btn ghost" id="ndCancel">取消</button></div><button class="btn" id="ndSave">保存</button></div></div></div></div>';
    const overlay = document.createElement("div");
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    const wrap = overlay.firstElementChild;
    $("#ndCancel", wrap).onclick = () => overlay.remove();
    $("#ndSave", wrap).onclick = () => {
      const title = $("#ndTitle", wrap).value.trim();
      if (!title) return err("标题不能为空");
      const d = store.get();
      d.path.nodes.push(makePathNode({ type: $("#ndType", wrap).value, title, description: $("#ndDesc", wrap).value.trim(), due_at: $("#ndDue", wrap).value || null, status: "in_progress" }));
      store.persist();
      overlay.remove();
      managerToast("已添加节点", "ok");
      renderLifePath();
    };
  }

  /* ============================================================
   * 6. Onboarding 共创向导
   * ============================================================ */
  let ob = { step: 0, interests: [], thought: "", draft: [] };
  const OB_STEPS = 4;
  function renderOnboarding() {
    openOnboarding();
  }
  function openOnboarding() {
    const overlay = $("#onboardingOverlay");
    overlay.classList.remove("hidden");
    ob = { step: 0, interests: store.get().user.interests.slice(), thought: "", draft: draftFromPath(store.get().path) };
    overlay.innerHTML = obShell();
    renderObStep();
  }
  function closeOnboardingOverlay() {
    const o = $("#onboardingOverlay");
    o.classList.add("hidden"); o.innerHTML = "";
  }
  function obShell() {
    return '<div class="onboarding-wrap"><div class="ob-top"><div class="ob-title"></div><button class="btn ghost sm" id="obClose">✕ 关闭</button></div>' +
      '<div class="ob-progress"><div class="bar" style="width:0%"></div></div><div id="obContent"></div></div>';
  }
  function draftFromPath(path) {
    return path.nodes.map((n) => ({ id: n.id, type: n.type, title: n.title, status: n.status }));
  }
  function renderObStep() {
    const wrap = $("#onboardingOverlay .onboarding-wrap");
    $("#onboardingOverlay .ob-title").textContent = obStepTitle(ob.step);
    $("#onboardingOverlay .ob-progress .bar").style.width = ((ob.step + 1) / OB_STEPS) * 100 + "%";
    $("#obContent").innerHTML = obStepContent(ob.step);
    bindObStep(ob.step);
  }
  function obStepTitle(step) {
    return [
      "Step 1 · 了解”我“",
      "Step 2 · 聊聊你的想法",
      "Step 3 · 共创人生路径",
      "Step 4 · 定目标",
    ][step];
  }
  function obStepContent(step) {
    if (step === 0) return obStepInterests();
    if (step === 1) return obStepThought();
    if (step === 2) return obStepDraft();
    return obStepGoals();
  }
  function obStepInterests() {
    const chips = INTERESTS.map((i) => '<button class="chip' + (ob.interests.includes(i.slug) ? " selected" : "") + '" data-islug="' + i.slug + '">' + i.emoji + " " + i.label + "</button>").join("");
    return (typeof onboardingIntroHTML === "function" ? onboardingIntroHTML() : "") +
      '<h2 class="ob-title">选择一个或多个兴趣板块</h2><div class="ob-desc">你选了哪些，我就知道你大概在意什么。</div><div class="ob-block"><div class="chip-list">' + chips + "</div></div>" +
      '<div class="ob-actions"><div></div><button class="btn" id="obNext0">继续 →</button></div>';
  }
  function obStepThought() {
    return '<h2 class="ob-title">说说你对人生的想法（哪怕很模糊）</h2>' +
      '<div class="ob-desc">AI 不评判，只倾听。</div>' +
      '<div class="ob-block"><textarea id="obThought" rows="5" placeholder="比如：我想做点有影响的事，但现在还不太确定方向……">' + esc(ob.thought) + "</textarea></div>" +
      '<div class="ob-actions"><button class="btn ghost" id="obBack1">← 上一步</button><button class="btn" id="obNext1">继续 →</button></div>';
  }
  function obStepDraft() {
    const items = ob.draft.map((n, i) =>
      '<div class="draft-node"><div class="dn-main"><div class="dn-type">' + esc(typeLabel(n.type)) + (n.status === "pending" ? ' <span class="tag warn">待定</span>' : "") + "</div><div class='dn-title'>" + esc(n.title) + "</div></div><div class='dn-actions'>" +
      '<button class="btn sm ghost" data-draft-up="' + i + '">↑</button><button class="btn sm ghost" data-draft-sort="' + n.id + '" data-sortdown="' + i + '">↓</button>' +
      '<button class="btn sm ghost" data-draft-order="' + n.id + '" data-order="' + i + '">排序</button>' +
      '<button class="btn sm ghost" data-draft-del="' + n.id + '">删</button></div></div>'
    ).join("");
    return '<h2 class="ob-title">AI 提议的人生路径草案</h2>' +
      '<div class="ob-desc">这是 AI 根据你的兴趣与想法整理的草案。你可以增删、排序；没想好的位置直接标「待定」，AI 不强求。</div>' +
      '<div class="ob-block">' + (items || '<div class="empty">还没有节点</div>') + "</div>" +
      '<div class="ob-actions"><button class="btn ghost" id="obAddDraft">+ 增补节点</button><button class="btn ghost" id="obBack2">← 上一步</button><button class="btn" id="obNext2">继续 →</button></div>';
  }
  function obStepGoals() {
    const counts = { vision: 0, long_term_goal: 0, short_term_goal: 0 };
    ob.draft.forEach((n) => counts[n.type] = (counts[n.type] || 0) + 1);
    return '<h2 class="ob-title">最后，在路径上商定目标</h2>' +
      '<div class="ob-desc">长期 / 短期目标都允许「待定」，AI 不催促。</div>' +
      '<div class="ob-block"><ul style="line-height:2">' +
      '<li>🎯 长期目标：<b>' + (counts.long_term_goal || 0) + '</b> 个</li>' +
      '<li>🏁 短期目标：<b>' + (counts.short_term_goal || 0) + '</b> 个</li>' +
      '<li>🧭 愿景节点：<b>' + (counts.vision || 0) + "</b> 个</li></ul>" +
      '<div class="ob-note">这些会沉淀为你的<b>个人路径档案</b>，成为未来一切 AI 辅导的依据。现在或以后都可以修改。</div></div>' +
      '<div class="ob-actions"><button class="btn ghost" id="obBack3">← 上一步</button><button class="btn violet" id="obFinish">完成，生成我的路径档案 ✨</button></div>';
  }
  function bindObStep(step) {
    const wrap = $("#onboardingOverlay");
    if (step === 0) {
      wrap.querySelectorAll("[data-islug]").forEach((b) => (b.onclick = () => {
        const s = b.dataset.islug;
        const ix = ob.interests.indexOf(s);
        if (ix >= 0) ob.interests.splice(ix, 1); else ob.interests.push(s);
        b.classList.toggle("selected");
      }));
      $("#obNext0").onclick = () => { goObStep(1); };
    }
    if (step === 1) {
      $("#obBack1").onclick = () => goObStep(0);
      $("#obNext1").onclick = () => { ob.thought = $("#obThought").value.trim(); generateDraft(); goObStep(2); };
    }
    if (step === 2) {
      $("#obBack2").onclick = () => goObStep(1);
      $("#obAddDraft").onclick = obAddDraft;
      $("#obNext2").onclick = () => goObStep(3);
      wrap.querySelectorAll("[data-draft-del]").forEach((b) => (b.onclick = () => { ob.draft = ob.draft.filter((n) => n.id !== b.dataset.draftDel); renderObStep(); }));
      wrap.querySelectorAll("[data-order]").forEach((b) => (b.onclick = () => obReorder(b.dataset.order)));
    }
    if (step === 3) {
      $("#obBack3").onclick = () => goObStep(2);
      $("#obFinish").onclick = finishOnboarding;
    }
    $("#obClose").onclick = closeOnboardingOverlay;
  }
  function goObStep(n) {
    ob.step = n;
    renderObStep();
  }
  function generateDraft() {
    // 根据用户兴趣 + 想法生成初稿
    const l3 = ["计算机 / AI", "数学", "科创 / 工程"].filter((k) => ob.interests.some((s) => INTERESTS.find((i) => i.slug === s && i.label === k)));
    const drafts = [];
    const visionTitle = ob.thought ? ob.thought.slice(0, 24) : "成为能解决真实问题的人";
    drafts.push({ id: uid(), type: "vision", title: visionTitle.replace(/[。，.!?`·]/g, "") || "成为更好的自己", status: "in_progress" });
    drafts.push({ id: uid(), type: "long_term_goal", title: "高三前完成一个有影响的项目", status: "in_progress" });
    ob.interests.forEach((sl) => {
      const label = INTERESTS.find((i) => i.slug === sl);
      if (label) drafts.push({ id: uid(), type: "interest", title: label.label + "·兴趣板块", status: "in_progress" });
    });
    drafts.push({ id: uid(), type: "short_term_goal", title: "期末选定一个方向课题", status: "pending" });
    drafts.push({ id: uid(), type: "short_term_goal", title: "把期末总评提升一级", status: "in_progress" });
    drafts.push({ id: uid(), type: "note", title: "升学方向：待定", status: "pending" });
    ob.draft = drafts;
  }
  function obAddDraft() {
    ob.draft.push({ id: uid(), type: "short_term_goal", title: "新增待定节点", status: "pending" });
    renderObStep();
  }
  function obReorder(orderIdx) {
    const n = ob.draft[orderIdx];
    if (!n) return;
    const next = ob.draft[orderIdx + 1];
    if (next) { ob.draft[orderIdx] = next; ob.draft[orderIdx + 1] = n; renderObStep(); }
  }
  function finishOnboarding() {
    const d = store.get();
    d.user.interests = ob.interests.slice();
    d.path.title = "我的高中三年";
    d.path.nodes = ob.draft.map((n, idx) => makePathNode({ parent_id: null, type: n.type, title: n.title, description: "", status: n.status, order: idx, source: "user", completed_at: n.status === "achieved" ? now() : null }));
    // 保留原本已达成的一个节点展示
    store.persist();
    closeOnboardingOverlay();
    navigate("life-path");
    managerToast("✨ 你的个人路径档案已生成", "ok");
  }

  /* ---------- helpers ---------- */
  function statusMeta(status) {
    const map = {
      in_progress: { label: "进行中", cls: "primary", done: "🟢" },
      achieved: { label: "已达成", cls: "accent", done: "✅" },
      pending: { label: "待定", cls: "warn", done: "⏳" },
      abandoned: { label: "已放弃", cls: "danger", done: "🚫" },
    };
    return map[status] || { label: status, cls: "", done: "•" };
  }
  function typeLabel(t) {
    const map = { vision: "愿景", long_term_goal: "长期目标", short_term_goal: "短期目标", task: "任务", interest: "兴趣板块", note: "备注" };
    return map[t] || t;
  }
  function emptyBox(emo, text) { return '<div class="empty"><div class="emo">' + emo + "</div>" + esc(text) + "</div>"; }

  function bindDataGo() {
    document.querySelectorAll("[data-go]").forEach((el) => (el.onclick = () => navigate(el.dataset.go)));
  }

  /* ---------- init ---------- */
  function init() {
    renderShell();
    bindSidebar();
    ensureTimer();
    if (!store.get() || store.get().path.nodes.length === 0) {
      // 首次为空可自动弹 onboarding
    }
    const initial = (location.hash || "#/dashboard").replace("#/", "").split("/")[0] || "dashboard";
    navigate(initial);
    window.addEventListener("hashchange", () => {
      const r = (location.hash || "#/dashboard").replace("#/", "").split("/")[0] || "dashboard";
      if (r !== state.route) navigate(r);
    });
  }

  window.addEventListener("DOMContentLoaded", init);
  BNDS.ui = { navigate, openOnboarding, toast, renderLifePath, renderDashboard };
})();
