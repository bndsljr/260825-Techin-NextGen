(function () {
  const B = BNDS;
  const { store, INTERESTS, uid, now, todayISO, pad, slotsForDate, API } = B;

  const S = {
    tab: 0,
    seg: "path",
    editingNode: null,
    draftFromSuggestion: null,
    activeContextTag: null,
    focus: { running: false, remaining: 0, total: 0, timerId: null, goalTitle: null },
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
      '<div class="foot-line"><span>后端 API</span><span class="tag primary">' + API.base.replace("https://api.bnds.example.com", "") + " · " + (API.provider === "mock" ? "mock" : "live") + "</span></div>" +
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

  const collapsedTreeNodes = new Set();

  function renderPathBody(d) {
    const nodes = d.path.nodes.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    const counts = { in_progress: 0, achieved: 0, pending: 0, abandoned: 0 };
    nodes.forEach((n) => (counts[n.status] = (counts[n.status] || 0) + 1));

    // 寻找根节点 (无 parent_id 或 parent 不在列表中)
    const rootNodes = nodes.filter((n) => !n.parent_id || !nodes.some((p) => p.id === n.parent_id));

    const treeHTML = rootNodes.length
      ? rootNodes.map((root) => renderTreeNodeHTML(root, nodes, 0)).join("")
      : emptyBox("🧭", "还没有节点，点右上「新增节点」开始");

    return '<div class="card"><div class="card-head"><div><span class="card-title">' + esc(d.path.title || "高一至高三全景探索与规划") + '</span><div style="font-size:12px;color:var(--text-soft);margin-top:2px">共 ' + nodes.length + ' 个规划节点 · 随时可调整或待定</div></div><button class="btn sm" id="addNode">+ 新增节点</button></div>' +
      '<div class="text-soft" style="font-size:13px;margin:10px 0 16px">' +
      '<span class="tag primary">进行中 ' + counts.in_progress + '</span> ' +
      '<span class="tag accent">已达成 ' + counts.achieved + '</span> ' +
      '<span class="tag warn">待定 ' + counts.pending + '</span> ' +
      '<span class="tag muted">已放弃 ' + counts.abandoned + '</span></div>' +
      '<div class="tree-root-container">' + treeHTML + "</div></div>" +
      '<div class="ob-note" style="background:var(--oxford-soft);color:var(--oxford)">🫵 状态四态平等，任何节点都可标「待定」、暂停或推翻；AI 永远只帮你梳理。</div>';
  }

  function renderTreeNodeHTML(node, allNodes, level) {
    const children = allNodes.filter((n) => n.parent_id === node.id);
    const hasChildren = children.length > 0;
    const isCollapsed = collapsedTreeNodes.has(node.id);

    const typeIcons = {
      vision: "🌟",
      long_term_goal: "🎯",
      short_term_goal: "⛳",
      task: "📋",
      interest: "💡",
      note: "📝"
    };
    const icon = typeIcons[node.type] || "📌";

    const collapseBtn = hasChildren
      ? `<button class="tree-toggle-btn" data-toggle-tree="${node.id}" title="${isCollapsed ? '展开子节点' : '折叠子节点'}">${isCollapsed ? '▶' : '▼'}</button>`
      : `<span class="tree-icon-holder">${icon}</span>`;

    let html = `
      <div class="tree-node-wrapper level-${level}" id="tree-node-${node.id}">
        <div class="tree-node-card status-${node.status}">
          <div class="tree-node-top">
            ${collapseBtn}
            <div class="tree-node-header-info">
              <div class="tree-node-type-badge">${esc(typeLabel[node.type] || node.type)}</div>
              <div class="tree-node-title">${esc(node.title)}</div>
            </div>
            <div class="tree-node-status-badge">
              <select class="node-status-select" data-status-node="${node.id}">
                <option value="in_progress" ${node.status === "in_progress" ? "selected" : ""}>🔄 进行中</option>
                <option value="pending" ${node.status === "pending" ? "selected" : ""}>⏳ 待定</option>
                <option value="achieved" ${node.status === "achieved" ? "selected" : ""}>✅ 已达成</option>
                <option value="abandoned" ${node.status === "abandoned" ? "selected" : ""}>🚫 已放弃</option>
              </select>
            </div>
          </div>
          ${node.description ? `<div class="tree-node-desc">${esc(node.description)}</div>` : ""}
          ${node.ai_note ? `<div class="tree-node-ai-note">💡 ${esc(node.ai_note)}</div>` : ""}
          <div class="tree-node-actions">
            <button class="where-btn sm" data-edit="${node.id}">✏️ 编辑</button>
            <button class="where-btn sm mentor-q-btn" data-qnode="${node.id}">✨ 问导师</button>
          </div>
        </div>
    `;

    if (hasChildren && !isCollapsed) {
      html += `
        <div class="tree-children-container">
          ${children.map((child) => renderTreeNodeHTML(child, allNodes, level + 1)).join("")}
        </div>
      `;
    }

    html += `</div>`;
    return html;
  }

  function bindLifePathActions() {
    const add = $("#addNode");
    if (add) add.onclick = () => openNodeEditor(null);

    // 折叠/展开
    document.querySelectorAll("[data-toggle-tree]").forEach((b) => (b.onclick = (e) => {
      e.stopPropagation();
      const id = b.dataset.toggleTree;
      if (collapsedTreeNodes.has(id)) {
        collapsedTreeNodes.delete(id);
      } else {
        collapsedTreeNodes.add(id);
      }
      renderMe();
    }));

    // 状态切换
    document.querySelectorAll("[data-status-node]").forEach((sel) => (sel.onchange = (e) => {
      const id = sel.dataset.statusNode;
      const newStatus = sel.value;
      const d = store.get();
      const n = d.path.nodes.find((x) => x.id === id);
      if (n) {
        n.status = newStatus;
        n.source = "user";
        if (newStatus === "achieved") n.completed_at = now();
        store.persist();
        persistToast("已更新状态为「" + (statusMeta[newStatus]?.label || newStatus) + "」", true);
        renderMe();
      }
    }));

    // 编辑
    document.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => {
      const d = store.get();
      openNodeEditor(d.path.nodes.find((x) => x.id === b.dataset.edit));
    }));

    // 问导师
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
    return '<div class="timeline-slot"><div class="t-time">' + s.start_at + "</div>" +
      '<div class="t-line" style="background:' + color + '"></div>' +
      '<div class="t-main"><div class="t-title">' + esc(s.title) + (focus ? ' <span class="tag warn">专注</span>' : "") + "</div>" +
      '<div class="t-meta">' + esc(s.subtitle || "—") + (s.room ? " · " + esc(s.room) : "") + "</div>" +
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
        sender: "mentor", id: uid(), content: "我是你的辅导与建议者。所有规划与调整，决定权永远在你。想聊什么？成绩、路径、今天的日程，或点下方快捷提问。", related_context_tag: null,
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
    if (m.sender === "user") return '<div class="chat-msg user"><div class="avatar user">我</div><div class="chat-bubble">' + m.content + "</div></div>";
    let extra = "";
    if (m.reason) extra += '<div class="why"><div class="why-label">💡 为什么这么建议</div>' + m.reason + "</div>";
    if (m.suggestions && m.suggestions.length) extra += m.suggestions.map((s) => sugCardHTML(s)).join("");
    if (m.openQuestions && m.openQuestions.length) extra += '<div class="ob-note"><b>给我的问题：</b> ' + m.openQuestions.map(esc).join("；") + "</div>";
    return '<div class="chat-msg"><div class="avatar mentor">导</div><div class="chat-bubble">' + m.content + "<div>" + extra + "</div></div></div>";
  }
  function sugCardHTML(s) {
    let state = "";
    if (s.status === "postponed") state = '<span class="tag warn">暂缓</span>';
    else if (s.status === "rejected") state = '<span class="tag muted">不采纳</span>';
    else if (s.status === "accepted") state = '<span class="tag accent">已采纳</span>';
    const title = s.title || s.text;
    return '<div class="suggest-card" id="sug-' + s.id + '"><div class="s-text">💡 ' + esc(title) + "</div>" +
      (s.text && s.text !== title ? '<div style="font-size:13px;margin:4px 0">' + esc(s.text) + "</div>" : "") +
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
  async function sendMentor(text) {
    appendMessage({ sender: "user", id: uid(), content: esc(text), related_context_tag: S.activeContextTag });
    showTyping();
    const ctx = S.activeContextTag;
    const d = store.get();

    try {
      const systemPrompt = `你是北京十一学校（BNDS）专属 AI 学业与人生规划导师，遵循【辅助不越位】核心原则。
当前辅导学生：李佳睿（高一，学号 26111422，学期：2026-2027学年上学期）。
课表重点：周五 14:25-18:00 为「工程-创意万物造-1」（容光楼T109 3节连堂实践）；主修数学Ⅲ-4 (S218A)、物理ⅢA-2 (S319A) 等 32 节周课表。
愿景：成为兼具工程落地能力与跨学科创造力的科技创造者。
原则：人为主导，AI 辅助不越位，决定权始终由学生自己拍板。
当给出具体建议时，请在正文末尾附带 \`\`\`suggestion_json 代码块：
\`\`\`suggestion_json
{
  "title": "简短建议标题",
  "text": "具体描述",
  "reason": "依据：结合课表或评价的具体推导理由",
  "target_node_type": "task" 或 "short_term_goal" 或 "long_term_goal",
  "proposed_node_title": "建议节点标题",
  "proposed_node_description": "建议节点描述"
}
\`\`\`
`;
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer sk-94c7df0ef42745b5a45f0ac14b0c6874"
        },
        body: JSON.stringify({
          model: "deepseek-v4-flash-vision-exp",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: (ctx ? `【当前聚焦上下文：${ctx}】\n` : "") + text }
          ],
          temperature: 0.6,
          max_tokens: 1200
        })
      });

      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const raw = data.choices[0].message.content;
      hideTyping();
      appendMessage(parseAiMessage(raw, ctx));
    } catch (err) {
      console.warn("[Mentor] DeepSeek API fallback:", err);
      setTimeout(() => {
        hideTyping();
        appendMessage(buildAiReply(text, ctx));
      }, 500);
    }
  }

  function parseAiMessage(raw, ctx) {
    const sugRegex = /```(?:suggestion_json|json)?\s*([\s\S]*?)\s*```/;
    const match = raw.match(sugRegex);
    let clean = raw.replace(sugRegex, "").trim();
    let suggestions = [];
    if (match && match[1]) {
      try {
        const obj = JSON.parse(match[1]);
        const s = Array.isArray(obj) ? obj[0] : obj;
        if (s) {
          suggestions.push({
            id: uid(),
            title: s.title || "学业规划建议",
            text: s.text || s.body || "",
            reason: s.reason || s.detail || "依据：十一学校云平台课表与学业数据",
            target_node_type: s.target_node_type || s.targetNodeType || "task",
            proposed_node_title: s.proposed_node_title || s.proposedNodeTitle || s.title || "新建议",
            proposed_node_description: s.proposed_node_description || s.proposedNodeDescription || s.text || "",
            status: "pending_review"
          });
        }
      } catch (e) {}
    }
    return {
      sender: "mentor",
      id: uid(),
      content: clean.replace(/\n/g, "<br/>"),
      reason: "由 DeepSeek 大模型实时分析推导",
      suggestions: suggestions.length ? suggestions : undefined,
      related_context_tag: ctx
    };
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
    const s = findSuggestion(id); if (!s) return; s.status = "postponed";
    store.persist(); updateSugCard(id); persistToast("好的，先暂缓这条建议。", false);
  }
  function declineSuggestion(id) {
    const s = findSuggestion(id); if (!s) return; s.status = "rejected";
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
    appendMessage({ sender: "user", id: uid(), content: esc(text), related_context_tag: contextLabel });
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
      '<div class="field"><label>标题</label><input id="edTitle" value="' + esc(sug.proposed_node_title || sug.title || sug.text) + '" /></div>' +
      '<div class="field"><label>描述（AI 依据，供你参考 / 可改）</label><textarea id="edDesc" rows="2">' + esc(sug.proposed_node_description || sug.reason || "") + "</textarea></div>" +
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
    S.focus = { running: true, remaining: min * 60, total: min * 60, timerId: null, goalTitle: "手动专注" };
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
    d.focusSessions.push({ id: uid(), user_id: d.user.id, slot_id: null, goal_title: S.focus.goalTitle || "手动专注", planned_duration_min: Math.round(S.focus.total / 60), actual_duration_min: totalMin, status: complete ? "completed" : "interrupted", reflection_note: null, started_at: now(), ended_at: now() });
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
