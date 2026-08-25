/**
 * 适配器契约（Adapter Contract）
 *
 * `docs/module-data-ingest.md` 第 4 节：每个数据源一个适配器，统一暴露
 * `normalize(source, raw) -> NormalizedData`。适配器只做「解析归一化」，不做业务决策。
 *
 * 为了让流水线真正可运行，我们在 normalize 之上增加了一个 `fetch` 阶段：
 * `fetch` 负责从外部平台拿到「原始数据」，`normalize` 把它转成归一化模型。
 * 二者解耦，便于：
 *   - `manual`：fetch 读本地文件 / 上传的字符串；
 *   - `cloud` / `managebac`：fetch 暂时为「占位」，等真实爬虫接入后填入
 *     （见下方 `Crawler` 接口与各适配器里的文档说明）。
 */

import type { DataSource, NormalizedData } from '../model.ts';

/** 同步上下文：来源 + 授权凭证 + 调用方信息 */
export interface SyncContext {
  source: DataSource;
  /** 用户授权凭证（OAuth token / cookie / 手动提供的凭据），由客户端经 apps/api 传递 */
  credentials?: unknown;
  /** 本次同步的开始时间（用于生成 fetched_at） */
  now?: Date;
  /** 附加元信息，如租户 / 学期等，透传给适配器与爬虫 */
  meta?: Record<string, unknown>;
}

/**
 * 外部数据抓取器（爬虫）。真正接入云平台 / ManageBac 前为「待实现」。
 * `packages/data-ingest` 不直接依赖任何爬虫实现，而是通过该接口注入，
 * 从而保持适配器可测试、可替换。
 */
export interface Crawler {
  /**
   * 抓取原始数据。返回值是「爬虫与归一化器约定的中间格式」，
   * 具体形状见各适配器文件顶部的 `XxxRawPayload` 类型说明。
   */
  fetch(ctx: SyncContext): Promise<unknown>;
}

/** 数据源适配器统一接口 */
export interface Adapter {
  readonly source: DataSource;
  /** 拉取外部原始数据 */
  fetch(ctx: SyncContext): Promise<unknown>;
  /** 解析并归一化为统一模型（只做归一化，不做业务决策） */
  normalize(ctx: SyncContext, raw: unknown): NormalizedData;
}
