/**
 * 发送通知动作执行器
 *
 * 通过消息中心发送多渠道通知。
 */

import type { AutomationAction } from '../types/action';
import type { ExecutionContext } from '../types/execution';
import type { NotifyService } from '../types/engine';
import type { VariableContext } from '../variable/VariableResolver';
import { ActionExecutorBase } from './ActionExecutorBase';

/**
 * 发送通知动作执行器
 *
 * 执行 send_notification 类型的动作，调用消息中心发送通知。
 */
export class SendNotificationExecutor extends ActionExecutorBase {
  private readonly notifyService: NotifyService;

  constructor(notifyService: NotifyService) {
    super();
    this.notifyService = notifyService;
  }

  /**
   * 执行发送通知动作
   */
  protected async executeAction(
    action: AutomationAction,
    context: ExecutionContext,
    variableContext: VariableContext,
  ): Promise<unknown> {
    if (!action.sendNotification) {
      throw new Error('发送通知动作配置缺失');
    }

    // 解析配置中的变量
    const config = this.resolveConfig(action.sendNotification, variableContext);

    // 解析接收人中的变量
    const recipients = config.recipients.map(recipient => ({
      type: recipient.type,
      value: this.variableResolver.resolve(recipient.value, variableContext),
    }));

    // 发送通知
    const result = await this.notifyService.send({
      channels: config.channels,
      recipients,
      title: config.title,
      content: config.content,
      priority: config.priority,
      variables: config.variables,
      templateId: config.templateId,
    });

    return {
      messageIds: result.messageIds,
      channels: config.channels,
      recipientCount: recipients.length,
    };
  }
}
