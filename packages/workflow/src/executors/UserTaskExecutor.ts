/**
 * 用户任务执行器（审批节点）
 */

import type { UserTask } from '@low-code/workflow-bpmn';
import { isUserTask } from '@low-code/workflow-bpmn';
import { NodeExecutorBase } from './NodeExecutorBase';
import type {
  ExecutionContext,
  ExecutionResult,
  ApprovalExecutionResult,
  TaskCreateParams,
} from '../types/execution';
import type { TaskRecord } from '../types/engine';

/**
 * 用户任务执行器
 * 处理审批节点，创建审批任务并等待审批
 */
export class UserTaskExecutor extends NodeExecutorBase {
  /**
   * 执行用户任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { currentNode, instance, variables, operator } = context;

    // 校验节点类型
    if (!isUserTask(currentNode)) {
      return this.createErrorResult('节点类型不是用户任务');
    }

    const userTask = currentNode as UserTask;

    // 更新当前节点
    await this.engine['updateInstance'](instance.id, {
      currentNodeId: currentNode.id,
    });

    // 获取审批配置
    const approvalConfig = this.getApprovalConfig(userTask);

    // 解析审批人
    const assignees = await this.resolveAssignees(userTask, variables, operator);

    // 创建任务
    const tasks: TaskCreateParams[] = [];

    if (approvalConfig.mode === 'single' || approvalConfig.mode === 'orSign') {
      // 单人审批或或签：为每个审批人创建任务
      for (const assignee of assignees) {
        tasks.push({
          nodeId: userTask.id,
          nodeName: userTask.name,
          assigneeId: assignee.id,
          assigneeName: assignee.name,
          dueDate: userTask.dueDate,
        });
      }
    } else if (approvalConfig.mode === 'countersign') {
      // 会签：为所有审批人创建任务
      for (const assignee of assignees) {
        tasks.push({
          nodeId: userTask.id,
          nodeName: userTask.name,
          assigneeId: assignee.id,
          assigneeName: assignee.name,
          dueDate: userTask.dueDate,
        });
      }
    }

    // 返回等待状态
    return {
      success: true,
      tasks,
      waiting: true,
    };
  }

  /**
   * 获取审批配置
   */
  private getApprovalConfig(node: UserTask): {
    mode: 'single' | 'countersign' | 'orSign';
    rejectAction: string;
    rejectTarget?: string;
  } {
    const extension = node.extensionElements as any;
    const approvalConfig = extension?.approvalConfig || {};

    return {
      mode: approvalConfig.mode || 'single',
      rejectAction: approvalConfig.rejectAction || 'rejectToStart',
      rejectTarget: approvalConfig.rejectTarget,
    };
  }

  /**
   * 解析审批人
   */
  private async resolveAssignees(
    node: UserTask,
    variables: Record<string, unknown>,
    operator?: { id: string; name: string }
  ): Promise<Array<{ id: string; name: string }>> {
    const assignees: Array<{ id: string; name: string }> = [];

    // 1. 直接指定的审批人
    if (node.assignee) {
      const resolved = this.resolveExpression(node.assignee, variables);
      if (resolved) {
        assignees.push({
          id: resolved,
          name: resolved, // 实际应该查询用户名称
        });
      }
    }

    // 2. 候选用户
    if (node.candidateUsers) {
      for (const candidate of node.candidateUsers) {
        const resolved = this.resolveExpression(candidate, variables);
        if (resolved) {
          assignees.push({
            id: resolved,
            name: resolved,
          });
        }
      }
    }

    // 3. 候选组
    if (node.candidateGroups) {
      // 实际应该查询组内的用户
      // 这里简化处理
    }

    // 4. 发起人
    if (operator) {
      assignees.push({
        id: operator.id,
        name: operator.name,
      });
    }

    // 去重
    const uniqueAssignees = assignees.filter(
      (assignee, index, self) =>
        index === self.findIndex(a => a.id === assignee.id)
    );

    return uniqueAssignees;
  }

  /**
   * 解析表达式
   */
  private resolveExpression(expression: string, variables: Record<string, unknown>): string | undefined {
    if (!expression) return undefined;

    // 处理 ${variable} 格式
    const match = expression.match(/^\$\{(.+)\}$/);
    if (match) {
      const varPath = match[1].trim();
      const value = this.getNestedValue(variables, varPath);
      return value != null ? String(value) : undefined;
    }

    // 直接返回
    return expression;
  }

  /**
   * 获取嵌套对象的值
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * 获取节点配置
   */
  getNodeConfig(node: UserTask) {
    return {
      type: 'bpmn:UserTask',
      waitForInput: true,
      timeout: node.dueDate ? new Date(node.dueDate).getTime() - Date.now() : undefined,
    };
  }
}
