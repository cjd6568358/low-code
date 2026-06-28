/**
 * 生效时间检查器
 *
 * 检查自动化规则是否在生效时间范围内。
 * 支持：
 * 1. 日期范围 — start/end 日期限制
 * 2. 时段过滤 — 按星期几和时间段过滤
 */

import type { AutomationRule, EffectiveTimeConfig, TimeRange } from '../types/rule';

/**
 * 生效时间检查结果
 */
export interface EffectiveTimeResult {
  /** 是否在生效时间内 */
  effective: boolean;
  /** 不生效的原因 */
  reason?: string;
  /** 下次生效时间（可选） */
  nextEffectiveTime?: string;
}

/**
 * 生效时间检查器
 *
 * 在规则执行前检查当前时间是否在生效范围内。
 */
export class EffectiveTimeChecker {
  /**
   * 检查规则是否在生效时间内
   *
   * @param rule - 自动化规则
   * @param now - 当前时间（可选，默认为当前时间）
   * @returns 检查结果
   */
  check(rule: AutomationRule, now?: Date): EffectiveTimeResult {
    if (!rule.effectiveTime) {
      return { effective: true };
    }

    const currentTime = now || new Date();
    return this.checkEffectiveTime(rule.effectiveTime, currentTime);
  }

  /**
   * 检查生效时间配置
   */
  private checkEffectiveTime(config: EffectiveTimeConfig, now: Date): EffectiveTimeResult {
    // 检查日期范围
    const dateRangeResult = this.checkDateRange(config, now);
    if (!dateRangeResult.effective) {
      return dateRangeResult;
    }

    // 检查时段过滤
    if (config.timeRanges && config.timeRanges.length > 0) {
      const timeRangeResult = this.checkTimeRanges(config.timeRanges, now);
      if (!timeRangeResult.effective) {
        return timeRangeResult;
      }
    }

    return { effective: true };
  }

  /**
   * 检查日期范围
   */
  private checkDateRange(config: EffectiveTimeConfig, now: Date): EffectiveTimeResult {
    if (config.start) {
      const startDate = new Date(config.start);
      if (now < startDate) {
        return {
          effective: false,
          reason: `规则尚未生效，生效开始时间: ${config.start}`,
          nextEffectiveTime: config.start,
        };
      }
    }

    if (config.end) {
      const endDate = new Date(config.end);
      if (now > endDate) {
        return {
          effective: false,
          reason: `规则已过期，生效结束时间: ${config.end}`,
        };
      }
    }

    return { effective: true };
  }

  /**
   * 检查时段过滤
   *
   * 检查当前时间是否在配置的时段内。
   * 多个时段之间是"或"的关系，只要匹配任一时段即可。
   */
  private checkTimeRanges(timeRanges: TimeRange[], now: Date): EffectiveTimeResult {
    const currentDay = now.getDay(); // 0=周日, 1=周一 ... 6=周六
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const range of timeRanges) {
      if (this.isInTimeRange(range, currentDay, currentMinutes)) {
        return { effective: true };
      }
    }

    // 找出下一个生效时段
    const nextTime = this.findNextEffectiveTime(timeRanges, now);

    return {
      effective: false,
      reason: `当前不在生效时段内`,
      nextEffectiveTime: nextTime,
    };
  }

  /**
   * 检查是否在指定时段内
   */
  private isInTimeRange(range: TimeRange, currentDay: number, currentMinutes: number): boolean {
    // 检查星期几
    if (!range.daysOfWeek.includes(currentDay)) {
      return false;
    }

    // 解析开始和结束时间
    const startMinutes = this.parseTimeToMinutes(range.startTime);
    const endMinutes = this.parseTimeToMinutes(range.endTime);

    if (startMinutes === undefined || endMinutes === undefined) {
      return false;
    }

    // 处理跨午夜的情况（如 22:00 - 06:00）
    if (startMinutes <= endMinutes) {
      // 正常范围
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // 跨午夜
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  /**
   * 将 HH:mm 格式的时间解析为分钟数
   */
  private parseTimeToMinutes(time: string): number | undefined {
    const parts = time.split(':');
    if (parts.length !== 2) return undefined;

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    if (isNaN(hours) || isNaN(minutes)) return undefined;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return undefined;

    return hours * 60 + minutes;
  }

  /**
   * 查找下一个生效时间
   */
  private findNextEffectiveTime(timeRanges: TimeRange[], now: Date): string | undefined {
    const currentDay = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // 在当前时段中查找
    for (const range of timeRanges) {
      if (!range.daysOfWeek.includes(currentDay)) continue;

      const startMinutes = this.parseTimeToMinutes(range.startTime);
      if (startMinutes !== undefined && startMinutes > currentMinutes) {
        // 今天还有时段
        const hours = Math.floor(startMinutes / 60);
        const mins = startMinutes % 60;
        const nextTime = new Date(now);
        nextTime.setHours(hours, mins, 0, 0);
        return nextTime.toISOString();
      }
    }

    // 查找本周内下一个生效日
    for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
      const nextDay = (currentDay + dayOffset) % 7;
      for (const range of timeRanges) {
        if (!range.daysOfWeek.includes(nextDay)) continue;

        const startMinutes = this.parseTimeToMinutes(range.startTime);
        if (startMinutes !== undefined) {
          const nextTime = new Date(now);
          nextTime.setDate(nextTime.getDate() + dayOffset);
          const hours = Math.floor(startMinutes / 60);
          const mins = startMinutes % 60;
          nextTime.setHours(hours, mins, 0, 0);
          return nextTime.toISOString();
        }
      }
    }

    return undefined;
  }

  /**
   * 获取生效时段的显示文本
   */
  getTimeRangeLabel(range: TimeRange): string {
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const days = range.daysOfWeek.map(d => dayNames[d]).join('、');
    return `${days} ${range.startTime}-${range.endTime}`;
  }
}
