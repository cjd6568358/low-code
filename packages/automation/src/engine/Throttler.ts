/**
 * 限流器
 *
 * 控制自动化规则的触发频率，防止过度执行。
 * 支持两种限流策略：
 * 1. 冷却时间 — 同一规则的最小触发间隔
 * 2. 每日上限 — 每日最大触发次数
 */

import type { AutomationRule, ThrottleConfig } from '../types/rule';
import type { LogStore } from '../types/engine';

/**
 * 限流检查结果
 */
export interface ThrottleResult {
  /** 是否允许触发 */
  allowed: boolean;
  /** 限流原因（不允许时） */
  reason?: string;
  /** 距离下次可触发的秒数（冷却中时） */
  retryAfterSeconds?: number;
}

/**
 * 限流器
 *
 * 在规则执行前检查是否应该被限流。
 */
export class Throttler {
  private readonly logStore: LogStore;
  /** 内存中的最近触发时间缓存（ruleId -> timestamp） */
  private readonly lastTriggerCache = new Map<string, number>();

  constructor(logStore: LogStore) {
    this.logStore = logStore;
  }

  /**
   * 检查规则是否允许触发
   *
   * @param rule - 自动化规则
   * @returns 检查结果
   */
  async check(rule: AutomationRule): Promise<ThrottleResult> {
    if (!rule.throttle) {
      return { allowed: true };
    }

    const config = rule.throttle;

    // 检查冷却时间
    const cooldownResult = await this.checkCooldown(rule.id, config);
    if (!cooldownResult.allowed) {
      return cooldownResult;
    }

    // 检查每日上限
    const dailyResult = await this.checkDailyLimit(rule.id, config);
    if (!dailyResult.allowed) {
      return dailyResult;
    }

    return { allowed: true };
  }

  /**
   * 记录规则触发
   *
   * 规则成功触发后调用，更新限流状态。
   */
  recordTrigger(ruleId: string): void {
    this.lastTriggerCache.set(ruleId, Date.now());
  }

  /**
   * 清除规则的限流缓存
   */
  clearCache(ruleId: string): void {
    this.lastTriggerCache.delete(ruleId);
  }

  /**
   * 检查冷却时间
   */
  private async checkCooldown(ruleId: string, config: ThrottleConfig): Promise<ThrottleResult> {
    if (!config.cooldownSeconds || config.cooldownSeconds <= 0) {
      return { allowed: true };
    }

    const cooldownMs = config.cooldownSeconds * 1000;
    const now = Date.now();

    // 先检查内存缓存
    const cachedLastTrigger = this.lastTriggerCache.get(ruleId);
    if (cachedLastTrigger) {
      const elapsed = now - cachedLastTrigger;
      if (elapsed < cooldownMs) {
        const retryAfterSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
        return {
          allowed: false,
          reason: `冷却中，距离上次触发仅 ${Math.floor(elapsed / 1000)} 秒，需要等待 ${config.cooldownSeconds} 秒`,
          retryAfterSeconds,
        };
      }
    }

    // 再检查数据库中的最近执行时间
    const lastExecutionTime = await this.logStore.getLastExecutionTime(ruleId);
    if (lastExecutionTime) {
      const lastTime = new Date(lastExecutionTime).getTime();
      const elapsed = now - lastTime;
      if (elapsed < cooldownMs) {
        // 更新缓存
        this.lastTriggerCache.set(ruleId, lastTime);
        const retryAfterSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
        return {
          allowed: false,
          reason: `冷却中，距离上次执行仅 ${Math.floor(elapsed / 1000)} 秒，需要等待 ${config.cooldownSeconds} 秒`,
          retryAfterSeconds,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * 检查每日上限
   */
  private async checkDailyLimit(ruleId: string, config: ThrottleConfig): Promise<ThrottleResult> {
    if (!config.maxDailyTriggers || config.maxDailyTriggers <= 0) {
      return { allowed: true };
    }

    const todayCount = await this.logStore.getTodayExecutionCount(ruleId);

    if (todayCount >= config.maxDailyTriggers) {
      return {
        allowed: false,
        reason: `今日已触发 ${todayCount} 次，达到每日上限 ${config.maxDailyTriggers} 次`,
      };
    }

    return { allowed: true };
  }
}
