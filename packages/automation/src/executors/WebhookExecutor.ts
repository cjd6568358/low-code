/**
 * Webhook 动作执行器
 *
 * 推送事件到外部 Webhook。
 */

import type { AutomationAction } from '../types/action';
import type { ExecutionContext } from '../types/execution';
import type { WebhookService } from '../types/engine';
import type { VariableContext } from '../variable/VariableResolver';
import { ActionExecutorBase } from './ActionExecutorBase';

/**
 * Webhook 动作执行器
 *
 * 执行 webhook 类型的动作，推送事件到外部 Webhook。
 */
export class WebhookExecutor extends ActionExecutorBase {
  private readonly webhookService: WebhookService;

  constructor(webhookService: WebhookService) {
    super();
    this.webhookService = webhookService;
  }

  /**
   * 执行 Webhook 动作
   */
  protected async executeAction(
    action: AutomationAction,
    context: ExecutionContext,
    variableContext: VariableContext,
  ): Promise<unknown> {
    if (!action.webhook) {
      throw new Error('Webhook 动作配置缺失');
    }

    // 解析配置中的变量
    const config = this.resolveConfig(action.webhook, variableContext);

    // 准备载荷
    const payload = config.payload || {
      event: context.event,
      rule: {
        id: context.ruleId,
        name: context.ruleName,
      },
      timestamp: new Date().toISOString(),
    };

    // 推送 Webhook
    const result = await this.webhookService.push(config.webhookId, payload);

    return {
      deliveryId: result.deliveryId,
      webhookId: config.webhookId,
    };
  }
}
