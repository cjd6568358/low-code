/**
 * 触发流程动作执行器
 *
 * 调用流程引擎启动新的流程实例。
 */

import type { AutomationAction } from '../types/action';
import type { ExecutionContext } from '../types/execution';
import type { WorkflowService } from '../types/engine';
import type { VariableContext } from '../variable/VariableResolver';
import { ActionExecutorBase } from './ActionExecutorBase';

/**
 * 触发流程动作执行器
 *
 * 执行 trigger_workflow 类型的动作，调用流程引擎启动实例。
 */
export class TriggerWorkflowExecutor extends ActionExecutorBase {
  private readonly workflowService: WorkflowService;

  constructor(workflowService: WorkflowService) {
    super();
    this.workflowService = workflowService;
  }

  /**
   * 执行触发流程动作
   */
  protected async executeAction(
    action: AutomationAction,
    context: ExecutionContext,
    variableContext: VariableContext,
  ): Promise<unknown> {
    if (!action.triggerWorkflow) {
      throw new Error('触发流程动作配置缺失');
    }

    // 解析配置中的变量
    const config = this.resolveConfig(action.triggerWorkflow, variableContext);

    // 启动流程实例
    const result = await this.workflowService.startWorkflow({
      workflowId: config.workflowId,
      variables: config.variables as Record<string, unknown> | undefined,
      startedBy: config.initiator || 'system',
      startedByName: '自动化引擎',
      sourceTable: `automation_${context.ruleId}`,
      sourceId: context.event.data.recordId as string | undefined,
    });

    return {
      instanceId: result.instanceId,
      workflowId: config.workflowId,
    };
  }
}
