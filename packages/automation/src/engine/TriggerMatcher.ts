/**
 * 触发器匹配器
 *
 * 负责检查事件是否匹配规则的触发器配置。
 * 支持 2 种触发器类型：data_change、schedule。
 */

import type { AutomationTrigger, PlatformEvent, TriggerType } from '../types/trigger';
import type { AutomationRule } from '../types/rule';

/**
 * 触发器匹配器
 *
 * 根据事件类型和触发器配置判断规则是否应该被触发。
 */
export class TriggerMatcher {
  /**
   * 检查事件是否匹配规则的触发器
   *
   * @param event - 平台事件
   * @param rule - 自动化规则
   * @returns 是否匹配
   */
  match(event: PlatformEvent, rule: AutomationRule): boolean {
    if (rule.status !== 'enabled') return false;
    return this.matchTrigger(event, rule.trigger);
  }

  /**
   * 批量匹配：返回所有匹配的规则
   *
   * @param event - 平台事件
   * @param rules - 规则列表
   * @returns 匹配的规则列表
   */
  matchAll(event: PlatformEvent, rules: AutomationRule[]): AutomationRule[] {
    return rules.filter(rule => this.match(event, rule));
  }

  /**
   * 检查事件是否匹配触发器配置
   */
  private matchTrigger(event: PlatformEvent, trigger: AutomationTrigger): boolean {
    switch (trigger.type) {
      case 'data_change':
        return this.matchDataChange(event, trigger);
      case 'schedule':
        return this.matchSchedule(event, trigger);
      default:
        return false;
    }
  }

  /**
   * 匹配数据变更触发器
   *
   * 事件格式：entity.created / entity.updated / entity.deleted
   */
  private matchDataChange(event: PlatformEvent, trigger: AutomationTrigger): boolean {
    const config = trigger.dataChange;
    if (!config) return false;

    // 检查事件类型前缀
    if (!event.type.startsWith('entity.')) return false;

    // 提取操作类型（created/updated/deleted）
    const operation = event.type.split('.')[1];
    const operationMap: Record<string, string> = {
      'created': 'create',
      'updated': 'update',
      'deleted': 'delete',
    };

    const mappedOperation = operationMap[operation];
    if (!mappedOperation) return false;

    // 检查操作类型是否在监听列表中
    if (!config.operations.includes(mappedOperation as 'create' | 'update' | 'delete')) {
      return false;
    }

    // 检查实体编码
    const eventEntityCode = event.data.entityCode as string;
    if (config.entityCode && eventEntityCode !== config.entityCode) {
      return false;
    }

    // 检查监听字段（仅 update 操作时有效）
    if (mappedOperation === 'update' && config.watchFields && config.watchFields.length > 0) {
      const changes = event.data.changes as Record<string, unknown> | undefined;
      if (!changes) return false;

      const changedFields = Object.keys(changes);
      const hasWatchedField = config.watchFields.some(field => changedFields.includes(field));
      if (!hasWatchedField) return false;
    }

    return true;
  }

  /**
   * 匹配定时触发器
   *
   * 定时触发器由外部调度器触发，事件类型为 "schedule.tick"。
   */
  private matchSchedule(event: PlatformEvent, trigger: AutomationTrigger): boolean {
    const config = trigger.schedule;
    if (!config) return false;

    // 定时触发器只匹配 schedule.tick 事件
    if (event.type !== 'schedule.tick') return false;

    // 检查 cron 表达式是否匹配（由外部调度器保证，这里只做基本校验）
    const eventCron = event.data.cron as string;
    if (eventCron && eventCron !== config.cron) return false;

    // 检查日期范围
    const now = new Date();
    if (config.startDate) {
      const startDate = new Date(config.startDate);
      if (now < startDate) return false;
    }
    if (config.endDate) {
      const endDate = new Date(config.endDate);
      if (now > endDate) return false;
    }

    return true;
  }

  /**
   * 获取触发器类型的显示名称
   */
  getTriggerTypeLabel(type: TriggerType): string {
    const labels: Record<TriggerType, string> = {
      'data_change': '数据变更',
      'schedule': '定时触发',
    };
    return labels[type] || type;
  }
}
