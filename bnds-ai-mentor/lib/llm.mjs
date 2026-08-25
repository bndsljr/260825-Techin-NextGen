// llm.mjs — 模型调用层。MOCK_LLM=1 或未配 key 时走 mock（稳定、0 成本、不依赖网络）；
// 否则走 DeepSeek chat completions(stream)。重分析场景切 deepseek-v4-pro + thinking。
// 产出：异步可迭代的原始文本分片（含 <<<SUGGESTIONS>>> 分隔符 + JSON），由 server 统一处理。

import https from 'node:https';
import { setTimeout as sleep } from 'node:timers/promises';
import { getPromptContext } from './store.mjs';

const API_KEY = process.env.DEEPSEEK_API_KEY || '';
const BASE = (process.env.DEEPSEEK_BASE || 'https://api.deepseek.com').replace(/\/+$/, '');
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const SUGGEST_DELIM = process.env.SUGGEST_DELIM || '<<<SUGGESTIONS>>>';

export const MOCK = process.env.MOCK_LLM === '1' || !API_KEY;

const SYSTEM_PROMPT = [
  '你是高校学业导师智能助手，遵循"辅助不越位"原则。',
  '你只给建议、梳理与提醒，绝不代替学生做主；涉及方向选择、选课、是否参赛、休学等关键决策时，明确标注需要学生自己决定。',
  '输出格式：先输出一段面向学生的正文（中文，语气克制、具体、可落地，忌空话），随后输出一行分隔符 ',
  SUGGEST_DELIM,
  ' 再输出一个 JSON 数组。每个元素形如：',
  '{"kind":"life_path_entry|schedule_adjust|assessment_plan|goal","title":"短标题","text":"具体描述","importance":"low|mid|high","decisionRequired":true|false,"detail":"为你补充的依据/数据说明，可空字符串"}',
  '最多 3 条。decisionRequired 为 true 表示该建议需要学生做决定，你绝不能代替学生采纳。',
].join('\n');

function buildUserPrompt(student, message) {
  const ctx = getPromptContext(student.id);
  return [
    '学生提问：' + (message || '（未输入，请基于当前状态给出本周学业建议）'),
    '',
    '学生当前状态（姓名已打码）：',
    JSON.stringify(ctx, null, 2),
    '',
    '请按系统要求输出正文 + 分隔符 + 结构化建议 JSON。',
  ].join('\n');
}

// ---------- mock ----------

function mockBody(student, message) {
  const ctx = getPromptContext(student.id);
  const gpa = ctx.gpa;
  const weak = ctx.assessments.filter((a) => a.score < 75).map((a) => a.course + '(该生' + a.type + a.score + '分)');
  const lines = [
    '收到。基于你当前的数据，我先帮你把状态捋一遍：',
    '',
    '你的学分绩点是 ' + gpa + '，整体处在中上区间，但有一门课明显拖了后腿。',
    '关于你问的「' + (message || '本周如何安排') + '」，我建议你优先把这块补起来。',
    '',
    '下面给几条具体可落地的建议，你可以看看哪些值得做。其中标注需要你拍板的，我不会替你决定。',
  ];
  if (weak.length) {
    lines.push('拖后腿的是：' + weak.join('、') + '，建议针对它做专项复习。');
  }
  lines.push('');
  lines.push('总之，把每周一个难点啃透比一次刷十页更有效。有什么想法我们继续聊。');
  return lines.join('\n');
}

function mockSuggestions(student, message) {
  return [
    {
      kind: 'assessment_plan',
      title: '数学分析专项补强',
      text: '针对薄弱科目，每周三、周日晚各安排 1 小时做真题 + 总结错因，4 周后复查。',
      importance: 'high',
      decisionRequired: false,
      detail: '基于本学期成绩数据，该科平均分低于你整体水平。',
    },
    {
      kind: 'schedule_adjust',
      title: '减少周六无效刷题时间',
      text: '把周六零散的刷题合并到周中固定时段，空出半天用于整理知识框架。',
      importance: 'mid',
      decisionRequired: false,
      detail: '',
    },
    {
      kind: 'life_path_entry',
      title: '是否报名算法竞赛训练营?',
      text: '该项目需投入每周约 6 小时，与你的冲刺计划时间有冲突，需要你决定是否参加。',
      importance: 'low',
      decisionRequired: true,
      detail: '此决定涉及你长期方向取舍，建议和导师再聊一次。',
    },
  ];
}

function* splitChunks(text, size) {
  for (let i = 0; i < text.length; i += size) {
    yield text.slice(i, i + size);
  }
}

export async function* mockStream(student, message) {
  const full = mockBody(student, message) + SUGGEST_DELIM + JSON.stringify(mockSuggestions(student, message), null, 2);
  // 故意把文本切得很碎，让分隔符跨越多个 chunk，以验证服务端 buffer 不漏。
  for (const piece of splitChunks(full, 6)) {
    yield piece;
    await sleep(6);
  }
}

// ---------- DeepSeek (stream) ----------

function apiRequest(payload) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE);
    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + '/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + API_KEY,
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          let err = '';
          res.on('data', (d) => (err += d));
          res.on('end', () => reject(new Error('DeepSeek HTTP ' + res.statusCode + ': ' + err)));
        } else {
          resolve(res);
        }
      }
    );
    req.on('error', reject);
    req.end(JSON.stringify(payload));
  });
}

export async function* deepseekStream(student, message) {
  const payload = {
    model: MODEL,
    stream: true,
    temperature: 0.5,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(student, message) },
    ],
  };
  const res = await apiRequest(payload);
  let buf = '';
  let isDone = false;
  res.setEncoding('utf8');
  for await (const chunk of res) {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') {
        isDone = true;
        continue;
      }
      let obj;
      try {
        obj = JSON.parse(data);
      } catch {
        continue;
      }
      const delta = obj && obj.choices && obj.choices[0] && obj.choices[0].delta;
      const text = delta && delta.content ? delta.content : '';
      if (text) yield text;
    }
  }
  if (!isDone && buf.trim()) {
    // 流结束但残余一行未处理（无 \n），尽量补上
    const line = buf.trim();
    if (line.startsWith('data:')) {
      const data = line.slice(5).trim();
      if (data && data !== '[DONE]') {
        try {
          const obj = JSON.parse(data);
          const delta = obj && obj.choices && obj.choices[0] && obj.choices[0].delta;
          const text = delta && delta.content ? delta.content : '';
          if (text) yield text;
        } catch {}
      }
    }
  }
}

export function streamLLM(student, message) {
  if (MOCK) return mockStream(student, message);
  return deepseekStream(student, message);
}

export function authInfo() {
  return { mock: MOCK, model: MODEL, base: BASE };
}
