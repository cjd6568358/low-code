/**
 * 跨平台 Cron 调度器
 *
 * 提供定时任务调度功能，支持标准 cron 表达式。
 * 基于 cron-parser 库实现，支持完整 cron 语法和时区处理。
 *
 * Cron 表达式格式：分 时 日 月 周
 * - * : 任意值
 * - , : 列表（如 1,3,5）
 * - - : 范围（如 1-5）
 * - / : 步长（如 star/5，star 代表 *）
 * - 特殊值：L（最后一天）、W（最近工作日）、#（第N个星期几）
 */

import { CronExpressionParser } from 'cron-parser';

/** Cron 字段类型 */
type CronField = 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek';

/** Cron 任务回调函数 */
type CronJobCallback = () => void | Promise<void>;

/** Cron 任务配置 */
export interface CronJobConfig {
  /** 任务 ID */
  id: string;
  /** Cron 表达式 */
  expression: string;
  /** 时区（如 'Asia/Shanghai'） */
  timezone?: string;
  /** 回调函数 */
  callback: CronJobCallback;
  /** 是否立即执行一次 */
  runOnInit?: boolean;
  /** 任务名称（用于日志） */
  name?: string;
}

/** Cron 任务状态 */
export interface CronJobStatus {
  id: string;
  name?: string;
  expression: string;
  timezone?: string;
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  runCount: number;
  errorCount: number;
  lastError?: string;
}

/** 解析后的 cron 字段值 */
interface ParsedCronField {
  /** 允许的值集合 */
  values: Set<number>;
  /** 是否为通配符 */
  isWildcard: boolean;
}

/** 解析后的 cron 表达式 */
interface ParsedCronExpression {
  minute: ParsedCronField;
  hour: ParsedCronField;
  dayOfMonth: ParsedCronField;
  month: ParsedCronField;
  dayOfWeek: ParsedCronField;
  /** 原始表达式 */
  raw: string;
}

/** Cron 任务实例 */
interface CronJobInstance {
  config: CronJobConfig;
  parsed: ParsedCronExpression;
  enabled: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  lastRunAt?: Date;
  nextRunAt?: Date;
  runCount: number;
  errorCount: number;
  lastError?: string;
}

/** 字段范围定义 */
const FIELD_RANGES: Record<CronField, { min: number; max: number }> = {
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  dayOfMonth: { min: 1, max: 31 },
  month: { min: 1, max: 12 },
  dayOfWeek: { min: 0, max: 6 }, // 0 = 周日
};

/** 字段名称映射 */
const FIELD_NAMES: CronField[] = ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'];

/**
 * Cron 调度器
 *
 * 管理和执行定时任务
 */
export class CronScheduler {
  private jobs: Map<string, CronJobInstance> = new Map();
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private timezone: string;

  /**
   * 创建调度器实例
   *
   * @param timezone 默认时区
   */
  constructor(timezone: string = 'Asia/Shanghai') {
    this.timezone = timezone;
  }

  /**
   * 启动调度器
   */
  start(): void {
    if (this.checkInterval) {
      return; // 已启动
    }

    // 每秒检查一次任务
    this.checkInterval = setInterval(() => {
      this.tick();
    }, 1000);

    console.log('[CronScheduler] 调度器已启动');
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // 清除所有任务定时器
    for (const job of this.jobs.values()) {
      if (job.timer) {
        clearTimeout(job.timer);
        job.timer = null;
      }
    }

    console.log('[CronScheduler] 调度器已停止');
  }

  /**
   * 添加定时任务
   *
   * @param config 任务配置
   * @returns 任务 ID
   */
  addJob(config: CronJobConfig): string {
    const parsed = parseCronExpression(config.expression);

    const job: CronJobInstance = {
      config,
      parsed,
      enabled: true,
      runCount: 0,
      errorCount: 0,
    };

    this.jobs.set(config.id, job);

    // 计算下次执行时间
    job.nextRunAt = this.calculateNextRun(job);

    // 如果需要立即执行
    if (config.runOnInit) {
      this.executeJob(job);
    }

    console.log(`[CronScheduler] 添加任务: ${config.name || config.id} (${config.expression})`);

    return config.id;
  }

  /**
   * 移除任务
   *
   * @param jobId 任务 ID
   * @returns 是否成功移除
   */
  removeJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.timer) {
      clearTimeout(job.timer);
    }

    this.jobs.delete(jobId);
    console.log(`[CronScheduler] 移除任务: ${job.config.name || jobId}`);

    return true;
  }

  /**
   * 启用任务
   *
   * @param jobId 任务 ID
   */
  enableJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.enabled = true;
    job.nextRunAt = this.calculateNextRun(job);
  }

  /**
   * 禁用任务
   *
   * @param jobId 任务 ID
   */
  disableJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.enabled = false;
    job.nextRunAt = undefined;

    if (job.timer) {
      clearTimeout(job.timer);
      job.timer = null;
    }
  }

  /**
   * 获取任务状态
   *
   * @param jobId 任务 ID
   * @returns 任务状态
   */
  getJobStatus(jobId: string): CronJobStatus | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    return {
      id: job.config.id,
      name: job.config.name,
      expression: job.config.expression,
      timezone: job.config.timezone,
      enabled: job.enabled,
      lastRunAt: job.lastRunAt,
      nextRunAt: job.nextRunAt,
      runCount: job.runCount,
      errorCount: job.errorCount,
      lastError: job.lastError,
    };
  }

  /**
   * 获取所有任务状态
   *
   * @returns 任务状态列表
   */
  getAllJobStatus(): CronJobStatus[] {
    return Array.from(this.jobs.values()).map(job => this.getJobStatus(job.config.id)!);
  }

  /**
   * 手动触发任务
   *
   * @param jobId 任务 ID
   */
  async triggerJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`任务不存在: ${jobId}`);
    }

    await this.executeJob(job);
  }

  /**
   * 更新任务表达式
   *
   * @param jobId 任务 ID
   * @param expression 新的 cron 表达式
   */
  updateExpression(jobId: string, expression: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.parsed = parseCronExpression(expression);
    job.config.expression = expression;
    job.nextRunAt = this.calculateNextRun(job);
  }

  /**
   * 时钟跳动
   */
  private tick(): void {
    const now = new Date();

    for (const job of this.jobs.values()) {
      if (!job.enabled) continue;
      if (!job.nextRunAt) continue;

      if (now >= job.nextRunAt) {
        this.executeJob(job);
      }
    }
  }

  /**
   * 执行任务
   */
  private async executeJob(job: CronJobInstance): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(`[CronScheduler] 执行任务: ${job.config.name || job.config.id}`);

      await job.config.callback();

      job.runCount++;
      job.lastRunAt = new Date();
      job.lastError = undefined;

      const duration = Date.now() - startTime;
      console.log(`[CronScheduler] 任务完成: ${job.config.name || job.config.id} (${duration}ms)`);
    } catch (error) {
      job.errorCount++;
      job.lastError = (error as Error).message;
      job.lastRunAt = new Date();

      console.error(`[CronScheduler] 任务失败: ${job.config.name || job.config.id}`, error);
    }

    // 计算下次执行时间
    job.nextRunAt = this.calculateNextRun(job);
  }

  /**
   * 计算下次执行时间
   *
   * 基于 cron-parser 库，使用数学算法而非暴力遍历。
   */
  private calculateNextRun(job: CronJobInstance): Date | undefined {
    if (!job.enabled) return undefined;

    const timezone = job.config.timezone || this.timezone;

    try {
      const interval = CronExpressionParser.parse(job.config.expression, {
        currentDate: new Date(),
        tz: timezone,
      });
      return interval.next().toDate();
    } catch {
      return undefined;
    }
  }
}

/**
 * 解析 cron 表达式
 *
 * @param expression cron 表达式（分 时 日 月 周）
 * @returns 解析后的表达式
 */
export function parseCronExpression(expression: string): ParsedCronExpression {
  const parts = expression.trim().split(/\s+/);

  if (parts.length !== 5) {
    throw new Error(`无效的 cron 表达式: ${expression}（需要 5 个字段）`);
  }

  const fields: CronField[] = ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'];
  const result: Partial<ParsedCronExpression> = {
    raw: expression,
  };

  for (let i = 0; i < 5; i++) {
    const field = fields[i];
    const range = FIELD_RANGES[field];
    result[field] = parseCronField(parts[i], range.min, range.max, field);
  }

  return result as ParsedCronExpression;
}

/**
 * 解析单个 cron 字段
 */
function parseCronField(
  value: string,
  min: number,
  max: number,
  fieldType: CronField
): ParsedCronField {
  const values = new Set<number>();

  // 处理通配符
  if (value === '*') {
    for (let i = min; i <= max; i++) {
      values.add(i);
    }
    return { values, isWildcard: true };
  }

  // 处理列表（逗号分隔）
  const items = value.split(',');
  for (const item of items) {
    parseCronItem(item.trim(), min, max, fieldType, values);
  }

  return { values, isWildcard: false };
}

/**
 * 解析单个 cron 项
 */
function parseCronItem(
  item: string,
  min: number,
  max: number,
  fieldType: CronField,
  values: Set<number>
): void {
  // 处理步长（*/n 或 range/n）
  if (item.includes('/')) {
    const [rangePart, stepPart] = item.split('/');
    const step = parseInt(stepPart, 10);

    if (isNaN(step) || step <= 0) {
      throw new Error(`无效的步长: ${stepPart}`);
    }

    let start = min;
    let end = max;

    if (rangePart !== '*') {
      const range = parseRange(rangePart, min, max);
      start = range.start;
      end = range.end;
    }

    for (let i = start; i <= end; i += step) {
      values.add(i);
    }
    return;
  }

  // 处理范围（n-m）
  if (item.includes('-')) {
    const range = parseRange(item, min, max);
    for (let i = range.start; i <= range.end; i++) {
      values.add(i);
    }
    return;
  }

  // 处理特殊值（L, W, #）
  if (fieldType === 'dayOfMonth' && item === 'L') {
    // 最后一天 - 添加所有可能的值（运行时检查）
    for (let i = 28; i <= 31; i++) {
      values.add(i);
    }
    return;
  }

  if (fieldType === 'dayOfWeek' && item.includes('#')) {
    // 第 N 个星期几 - 简化处理，添加该星期几
    const [day] = item.split('#');
    values.add(parseInt(day, 10));
    return;
  }

  // 处理单个数值
  const num = parseInt(item, 10);
  if (isNaN(num) || num < min || num > max) {
    throw new Error(`无效的值: ${item}（范围: ${min}-${max}）`);
  }
  values.add(num);
}

/**
 * 解析范围（n-m）
 */
function parseRange(range: string, min: number, max: number): { start: number; end: number } {
  const parts = range.split('-');
  if (parts.length !== 2) {
    throw new Error(`无效的范围: ${range}`);
  }

  const start = parseInt(parts[0], 10);
  const end = parseInt(parts[1], 10);

  if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
    throw new Error(`无效的范围: ${range}（允许: ${min}-${max}）`);
  }

  return { start, end };
}

/**
 * 校验 cron 表达式是否有效
 *
 * @param expression cron 表达式
 * @returns 校验结果
 */
export function validateCronExpression(expression: string): { valid: boolean; error?: string } {
  try {
    parseCronExpression(expression);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: (error as Error).message,
    };
  }
}

/**
 * 获取 cron 表达式的下次执行时间列表
 *
 * @param expression cron 表达式
 * @param count 返回的时间数量
 * @param timezone 时区
 * @returns 下次执行时间列表
 */
export function getNextRunTimes(
  expression: string,
  count: number = 5,
  timezone: string = 'Asia/Shanghai'
): Date[] {
  try {
    const interval = CronExpressionParser.parse(expression, {
      currentDate: new Date(),
      tz: timezone,
    });
    const results: Date[] = [];
    for (let i = 0; i < count; i++) {
      results.push(interval.next().toDate());
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * 格式化 cron 表达式为人类可读描述
 *
 * @param expression cron 表达式
 * @returns 描述文本
 */
export function describeCronExpression(expression: string): string {
  try {
    const parsed = parseCronExpression(expression);

    const parts: string[] = [];

    // 分析分钟
    if (parsed.minute.isWildcard) {
      parts.push('每分钟');
    } else if (parsed.minute.values.size === 1) {
      const min = Array.from(parsed.minute.values)[0];
      parts.push(`第 ${min} 分钟`);
    }

    // 分析小时
    if (parsed.hour.isWildcard) {
      parts.push('每小时');
    } else if (parsed.hour.values.size === 1) {
      const hour = Array.from(parsed.hour.values)[0];
      parts.push(`${hour} 点`);
    }

    // 分析日期
    if (!parsed.dayOfMonth.isWildcard) {
      if (parsed.dayOfMonth.values.size === 1) {
        const day = Array.from(parsed.dayOfMonth.values)[0];
        parts.push(`${day} 号`);
      }
    }

    // 分析月份
    if (!parsed.month.isWildcard) {
      if (parsed.month.values.size === 1) {
        const month = Array.from(parsed.month.values)[0];
        parts.push(`${month} 月`);
      }
    }

    // 分析星期
    if (!parsed.dayOfWeek.isWildcard) {
      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const days = Array.from(parsed.dayOfWeek.values)
        .map(d => dayNames[d])
        .join('、');
      parts.push(days);
    }

    return parts.join('，') || expression;
  } catch {
    return expression;
  }
}
