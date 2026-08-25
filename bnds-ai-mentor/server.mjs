// server.mjs — 零依赖 Node 后端。SSE 四类事件：meta / body / suggestion / done。
// 关键：流式正文里用 <<<SUGGESTIONS>>> 分隔符切出结构化建议；
// 服务端必须在流里检测分隔符并保留 "分隔符长度-1" 个字符的 buffer，
// 避免分隔符跨 chunk 时把 <<<SUGGESTIONS 半截漏到前端。去掉 buffer 会复现界面漏字符 bug。

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { streamLLM, authInfo, SUGGEST_DELIM } from './lib/llm.mjs';
import {
  desensitize,
  getSafeContext,
  listSuggestions,
  normalizeSuggestion,
  applyEntry,
  mockBusiness,
} from './lib/store.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function send(res, code, headers, body) {
  if (res.writableEnded) return;
  res.writeHead(code, headers);
  res.end(body);
}

function json(res, code, obj) {
  send(res, code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, JSON.stringify(obj));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

// ---- 分隔符切割（核心，勿删 buffer） ----
// feed(chunk) 负责：把正文分片流给 SSE，直到识别到分隔符；
// 识别后停止正文输出，其余内容（JSON）攒进 jsonAcc，最后统一解析成 suggestion 卡片。
function createDelimiterSplitter(emitBody, delim) {
  let pending = '';
  let inSuggestions = false;
  let jsonAcc = '';
  const hold = Math.max(0, delim.length - 1);

  const feed = (chunk) => {
    pending += chunk;
    let again = true;
    while (again) {
      again = false;
      const idx = pending.indexOf(delim);
      if (idx >= 0) {
        const bodyPart = pending.slice(0, idx);
        if (bodyPart) emitBody(bodyPart);
        const after = pending.slice(idx + delim.length);
        inSuggestions = true;
        jsonAcc += after;
        pending = '';
        again = true;
      } else if (inSuggestions) {
        jsonAcc += pending;
        pending = '';
        again = true;
      } else {
        const emitLen = pending.length - hold;
        if (emitLen > 0) {
          emitBody(pending.slice(0, emitLen));
          pending = pending.slice(emitLen);
          again = true;
        }
      }
    }
  };

  const finish = () => {
    if (inSuggestions) {
      jsonAcc += pending;
      pending = '';
    } else if (pending) {
      // 流结束。若残余恰是分隔符的"未完成前缀"，说明模型没吐完分隔符，丢弃，别漏。
      if (delim.startsWith(pending)) {
        pending = '';
      } else {
        emitBody(pending);
        pending = '';
      }
    }
    return jsonAcc;
  };

  return { feed, finish };
}

// ---- 建议 JSON 兜底解析（模型可能加 ```json 围栏或前后带废话） ----
function parseSuggestions(raw) {
  let text = (raw || '').trim();
  if (!text) return [];
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```\s*$/);
  if (fence) text = fence[1].trim();
  const startArr = text.indexOf('[');
  const startObj = text.indexOf('{');
  let start = -1;
  if (startArr >= 0 && startObj >= 0) start = Math.min(startArr, startObj);
  else if (startArr >= 0) start = startArr;
  else if (startObj >= 0) start = startObj;
  if (start > 0) text = text.slice(start);
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) return data.filter((x) => x && typeof x === 'object');
    if (data && Array.isArray(data.suggestions)) return data.suggestions.filter((x) => x && typeof x === 'object');
    return [];
  } catch {
    return [];
  }
}

function sse(res, event, data) {
  if (res.writableEnded || res.destroyed) return;
  try {
    res.write('event: ' + event + '\n');
    res.write('data: ' + JSON.stringify(data) + '\n\n');
  } catch {}
}

async function handleMentorStream(req, res, u) {
  const studentId = u.searchParams.get('studentId') || '202400101';
  const message = (u.searchParams.get('message') || '').slice(0, 2000);
  const student = { id: studentId };
  const safe = getSafeContext(studentId);
  if (!safe) return json(res, 404, { error: 'student not found: ' + studentId });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.on('close', () => {});
  sse(res, 'meta', { student: safe.student, grades: safe.grades, llm: authInfo() });

  const emitBody = (t) => sse(res, 'body', { text: desensitize(t, student) });
  const splitter = createDelimiterSplitter(emitBody, SUGGEST_DELIM);

  let suggestionCount = 0;
  try {
    for await (const chunk of streamLLM(studentId, message)) {
      splitter.feed(chunk);
    }
    const jsonAcc = splitter.finish();
    const parsed = parseSuggestions(jsonAcc);
    if (Array.isArray(parsed)) {
      const safeSuggestions = [];
      for (const s of parsed) {
        const rec = normalizeSuggestion(studentId, s, new Date().toISOString());
        if (rec) {
          safeSuggestions.push(rec);
          sse(res, 'suggestion', rec);
          suggestionCount++;
        }
      }
    }
    sse(res, 'done', { ok: true, suggestionCount });
  } catch (e) {
    sse(res, 'done', { ok: false, error: String((e && e.message) || e) });
  }
  res.end();
}

async function handleLifePath(req, res, u) {
  const studentId = u.searchParams.get('studentId') || '202400101';
  const safe = getSafeContext(studentId);
  if (!safe) return json(res, 404, { error: 'student not found' });
  const items = safe.lifePath.concat(
    listSuggestions(studentId).map((s) => ({ ...s, isSuggestion: true }))
  );
  json(res, 200, { items });
}

async function handleApply(req, res, u) {
  const studentId = u.searchParams.get('studentId') || '202400101';
  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (e) {
    return json(res, 400, { error: String((e && e.message) || e) });
  }
  const result = applyEntry(studentId, payload);
  json(res, result.status, result.body);
}

function handleBusiness(req, res, u) {
  const studentId = u.searchParams.get('studentId') || '202400101';
  const biz = mockBusiness(studentId);
  if (!biz) return json(res, 404, { error: 'student not found' });
  const p = u.pathname.replace(/^\/api\/business\//, '');
  const key = p || 'summary';
  if (key === 'life-path') return json(res, 200, biz['life-path']);
  if (key === 'slots') return json(res, 200, biz['schedule/slots']);
  if (key === 'assessments') return json(res, 200, biz.assessments);
  if (key === 'grades') return json(res, 200, biz['grades/summary']);
  json(res, 200, biz);
}

function serveStatic(req, res, u) {
  let p = u.pathname === '/' ? '/index.html' : u.pathname;
  const file = path.normalize(path.join(PUBLIC_DIR, p));
  if (!file.startsWith(PUBLIC_DIR)) return json(res, 403, { error: 'forbidden' });
  fs.readFile(file, (err, buf) => {
    if (err) return json(res, 404, { error: 'not found' });
    const ext = path.extname(file).toLowerCase();
    send(res, 200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' }, buf);
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const rt = req.method + ' ' + u.pathname;

  try {
    if (rt === 'GET /api/health') {
      json(res, 200, { ok: true, llm: authInfo(), suggestDelim: SUGGEST_DELIM });
    } else if (rt === 'GET /api/mentor/stream') {
      await handleMentorStream(req, res, u);
    } else if (rt === 'GET /api/life-path') {
      await handleLifePath(req, res, u);
    } else if (rt === 'POST /api/life-path/entries') {
      await handleApply(req, res, u);
    } else if (rt === 'GET /api/context') {
      const safe = getSafeContext(u.searchParams.get('studentId') || '202400101');
      if (!safe) return json(res, 404, { error: 'student not found' });
      json(res, 200, safe);
    } else if (rt.startsWith('GET /api/business/')) {
      handleBusiness(req, res, u);
    } else if (req.method === 'GET' && u.pathname === '/') {
      serveStatic(req, res, u);
    } else {
      json(res, 404, { error: 'not found: ' + u.pathname });
    }
  } catch (e) {
    if (!res.writableEnded) json(res, 500, { error: String((e && e.message) || e) });
    else res.end();
  }
});

server.listen(PORT, () => {
  console.log('[mentor] listening on *:' + PORT + '  (mock=' + authInfo().mock + ', model=' + authInfo().model + ')');
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
