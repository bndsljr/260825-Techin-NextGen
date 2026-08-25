# bnds-ai-mentor (学业导师 demo)

零依赖 Node 后端 + 单文件前端。核心定位：**AI 辅助不越位**，必须落成代码机制而非仅提示词。

## 一句话

`MOCK_LLM=1 PORT=8787 node server.mjs` 即起。SSE 流式输出正文，同时用 `<<<SUGGESTIONS>>>` 分隔符切出一组结构化建议卡片；AI 只能给建议，不能自己写入 life-path。

## 文件

| 文件 | 作用 |
|---|---|
| `server.mjs` | HTTP 服务：静态页 + `/api/mentor/stream`(SSE) + `/api/life-path` + `/api/context` + 业务接口 mock。核心里是分隔符 buffer 切割逻辑 `createDelimiterSplitter` |
| `lib/store.mjs` | 内存数据 + 脱敏 + 唯一写入口 `applyEntry`（`actor !== "user"` 返回 403）|
| `lib/llm.mjs` | `MOCK_LLM=1`（或未配 key）走 mock；否则走 DeepSeek chat completions(stream) |
| `public/index.html` | 前端：EventSource/SSE 解析、流式正文、建议卡片、"采纳"、"AI 直接写入演示 403" |
| `deploy.sh` | 自包含部署脚本（含本段源码） |
| `README.md` | 本文件 |

## 运行

```bash
# 本地 / mock（0 成本、0 依赖、0 外网）
MOCK_LLM=1 PORT=8787 node server.mjs

# 真实模型（重分析可切 deepseek-v4-pro + thinking）
DEEPSEEK_API_KEY=sk-xxx \
DEEPSEEK_MODEL=deepseek-chat \
PORT=8787 node server.mjs
```

浏览器打开 `http://<host:8787>/`。

## SSE 事件

| event | 载荷 | 说明 |
|---|---|---|
| `meta` | 学生脱敏上下文 + llm 信息 | 连接建立即发送 |
| `body` | `{text}` | 正文流式分片（已脱敏，断言不含分隔符） |
| `suggestion` | 单条建议卡片 | 分隔符之后的 JSON 逐条解析发出 |
| `done` | `{ok, suggestionCount}` | 结束 |

## 约束是怎么落成代码的

1. **AI 不越位（写入口校验）**：`store.applyEntry` 里 `if (actor !== "user") return 403`。建议采纳时并发 `{actor:"user", suggestionId}`，服务端执行 `source: ai_suggest → user, status: adopted`。
2. **decision_required 服务端强制覆盖**：客户端/模型传的 `decisionRequired` 不采信，由服务端统一决定。
3. **分隔符不泄漏**：`createDelimiterSplitter` 始终在 buffer 里保留 `delim.length - 1` 个字符再往下发；流结束时若残留恰好是分隔符前缀则丢弃。**删除 buffer 会复现“界面漏出 `<<<SUGGESTIONS` 半截”的 bug。**
4. **脱敏**：一切流向客户端的文本先经 `desensitize`（打码姓名/学号），姓名学号不会出现在流里。

## 待办 / 未验证

- 真实 DeepSeek 调用（无 key，mock 分支走通，real 分支未验证）
- 模型稳定输出分隔符 + 合法 JSON 的成功率（有兜底解析）
- 真实业务接口 /life-path /schedule/slots /assessments /grades/summary 与鉴权（现为 mock）
- production 化：history 换 DB、按 user 限流限配额、域名 + HTTPS、TS 化并入主仓库 `bndsljr/260825-Techin-NextGen`
