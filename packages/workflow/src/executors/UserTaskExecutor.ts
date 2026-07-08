/**
 * 用户任务执行器（审批节点）
 *
 * 支持单人审批、会签、或签、竞签四种模式。
 *
 * 审批模式：
 * - single: 单人审批（任一完成即继续）
 * - countersign: 会签（所有人完成才继续）
 * - orSign: 或签（一人完成即继续）
 * - raceSign: 竞签（先到先得，一人认领后其他任务自动取消）
 */

import type { UserTask, FlowNode } from '../schema';
import { isUserTask } from '../schema';
import { NodeExecutorBase } from './NodeExecutorBase';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskCreateParams,
} from '../types/execution';
import type { TaskRecord } from '../types/engine';
import type { ApprovalMode } from '../types/task';

/** 任务状态分布 */
interface StatusDistribution {
  status: string;
  count: number;
}

/** 审批配置 */
interface ApprovalConfig {
  /** 审批模式 */
  mode: ApprovalMode;
  /** 驳回动作 */
  rejectAction: 'rejectToStart' | 'rejectToPrevious' | 'rejectToNode' | 'rejectToEnd';
  /** 驳回目标节点（rejectToNode 时使用） */
  rejectTarget?: string;
  /** 超时配置 */
  timeout?: {
    duration: number;
    action: 'autoApprove' | 'autoReject' | 'notify' | 'transfer';
    transferTo?: string;
  };
}

/**
 * 用户任务执行器
 */
export class UserTaskExecutor extends NodeExecutorBase {
  /**
   * 执行用户任务 — 创建任务并等待审批
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { currentNode, instance, variables, operator } = context;

    if (!isUserTask(currentNode)) {
      return this.createErrorResult('节点类型不是用户任务');
    }

    const userTask = currentNode as UserTask;
    const approvalConfig = this.getApprovalConfig(userTask);

    // 更新当前节点
    await this.engine['updateInstance'](instance.id, {
      currentNodeId: currentNode.id,
    });

    // 解析审批人
    const assignees = await this.resolveAssignees(userTask, variables, operator);

    // 无审批人时直接通过
    if (assignees.length === 0) {
      return {
        success: true,
        waiting: false,
      };
    }

    // 创建任务
    const tasks: TaskCreateParams[] = assignees.map(assignee => ({
      nodeId: userTask.id,
      nodeName: userTask.name,
      assigneeId: assignee.id,
      assigneeName: assignee.name,
      dueDate: userTask.dueDate,
    }));

    // 如果配置了超时，设置节点级超时定时器
    if (approvalConfig.timeout?.duration) {
      this.scheduleNodeTimeout(
        instance.id,
        userTask.id,
        approvalConfig.timeout.duration,
        approvalConfig.timeout
      );
    }

    return {
      success: true,
      tasks,
      waiting: true,
    };
  }

  /**
   * 恢复执行 — 检查所有任务状态，决策是否继续
   */
  async resume(context: ExecutionContext, tasks: TaskRecord[]): Promise<ExecutionResult> {
    const { currentNode, instance } = context;
    const approvalConfig = this.getApprovalConfig(currentNode as UserTask);
    const { mode } = approvalConfig;

    // 计算状态分布
    const distribution = this.calculateDistribution(tasks);
    const assignees = tasks.map(t => t.assigneeId).filter(Boolean) as string[];

    // 根据模式决策
    const status = this.resolveStatus(distribution, assignees, mode);

    if (status === null) {
      // 还未完成，继续等待
      return { success: true, waiting: true };
    }

    // 审批已决（完成或驳回），清除节点超时定时器
    this.engine.clearNodeTimeout(instance.id, currentNode.id);

    // 审批完成
    if (status === 'resolved') {
      return { success: true, waiting: false };
    }

    // 审批驳回
    return {
      success: false,
      waiting: false,
      error: '审批被驳回',
    };
  }

  /**
   * 根据审批模式决策最终状态
   */
  private resolveStatus(
    distribution: StatusDistribution[],
    assignees: string[],
    mode: ApprovalMode
  ): string | null {
    // 单人模式：任一非 pending 状态即决策
    if (mode === 'single') {
      const done = distribution.find(d => d.status !== 'pending' && d.count > 0);
      return done ? done.status : null;
    }

    // 会签模式：所有人完成才决策
    if (mode === 'countersign') {
      const resolved = distribution.find(d => d.status === 'resolved');
      if (resolved && resolved.count === assignees.length) {
        return 'resolved';
      }
      const rejected = distribution.find(d => d.status === 'rejected');
      if (rejected && rejected.count > 0) {
        return 'rejected';
      }
      return null; // 继续等待
    }

    // 或签模式：一人完成即通过，全部驳回才驳回
    if (mode === 'orSign') {
      const resolved = distribution.find(d => d.status === 'resolved');
      if (resolved && resolved.count > 0) {
        return 'resolved';
      }
      const rejectedCount = distribution.reduce(
        (count, d) => (d.status === 'rejected' ? count + d.count : count),
        0
      );
      if (rejectedCount === assignees.length) {
        return 'rejected';
      }
      return null; // 继续等待
    }

    // 竞签模式：一人认领即决策（claimed -> resolved/rejected）
    if (mode === 'raceSign') {
      // 有人已完成（认领后完成）
      const resolved = distribution.find(d => d.status === 'resolved');
      if (resolved && resolved.count > 0) {
        return 'resolved';
      }
      // 有人已驳回
      const rejected = distribution.find(d => d.status === 'rejected');
      if (rejected && rejected.count > 0) {
        return 'rejected';
      }
      // 有人已认领但未完成，继续等待
      const claimed = distribution.find(d => d.status === 'claimed');
      if (claimed && claimed.count > 0) {
        return null; // 等待认领人完成
      }
      return null; // 继续等待
    }

    return null;
  }

  /**
   * 计算任务状态分布
   */
  private calculateDistribution(tasks: TaskRecord[]): StatusDistribution[] {
    const map = new Map<string, number>();

    for (const task of tasks) {
      const count = map.get(task.status) || 0;
      map.set(task.status, count + 1);
    }

    return Array.from(map.entries()).map(([status, count]) => ({
      status,
      count,
    }));
  }

  /**
   * 获取审批配置
   */
  private getApprovalConfig(node: FlowNode): ApprovalConfig {
    const extension = node.extensionElements as any;
    const config = extension?.approvalConfig || {};

    return {
      mode: config.mode || 'single',
      rejectAction: config.rejectAction || 'rejectToStart',
      rejectTarget: config.rejectTarget,
      timeout: config.timeout,
    };
  }

  /**
   * 解析审批人 — 根据 AssigneeStrategy 动态解析为具体用户列表
   *
   * 设计时存储策略描述（按用户/角色/部门/岗位），
   * 运行时通过 UserResolver 解析为具体用户。
   */
  private async resolveAssignees(
    node: UserTask,
    variables: Record<string, unknown>,
    operator?: { id: string; name: string }
  ): Promise<Array<{ id: string; name: string }>> {
    const strategy = node.assignee;
    if (!strategy) {
      return [];
    }

    const userResolver = this.engine.userResolver;

    switch (strategy.type) {
      case 'user': {
        // 直接指定用户 — 如果配置了 resolver 则查一次拿名称，否则直接用 ID
        if (userResolver && strategy.userIds.length > 0) {
          return userResolver.findByIds(strategy.userIds);
        }
        return strategy.userIds.map(id => ({ id, name: id }));
      }

      case 'role': {
        if (!userResolver) {
          console.warn('[UserTaskExecutor] 按角色指派但未配置 UserResolver，无法解析');
          return [];
        }
        return userResolver.findByRoles(strategy.roleIds);
      }

      case 'department': {
        if (!userResolver) {
          console.warn('[UserTaskExecutor] 按部门指派但未配置 UserResolver，无法解析');
          return [];
        }
        return userResolver.findByDepartments(strategy.deptIds);
      }

      case 'position': {
        if (!userResolver) {
          console.warn('[UserTaskExecutor] 按岗位指派但未配置 UserResolver，无法解析');
          return [];
        }
        return userResolver.findByPositions(strategy.positionIds);
      }

      default:
        return [];
    }
  }

  /**
   * 设置节点级超时
   * 超时后根据配置执行对应动作
   */
  private scheduleNodeTimeout(
    instanceId: string,
    nodeId: string,
    duration: number,
    timeoutConfig: NonNullable<ApprovalConfig['timeout']>
  ): void {
    this.engine.scheduleNodeTimeout(instanceId, nodeId, duration, async () => {
      try {
        // 获取实例和节点的所有 pending 任务
        const instance = await this.engine.getInstance(instanceId);
        if (!instance || (instance.status !== 'running' && instance.status !== 'waiting')) {
          return;
        }

        const allTasks = await this.engine['db'].all<TaskRecord>(
          `SELECT * FROM workflow_tasks WHERE instance_id = ? AND node_id = ? AND status = 'pending'`,
          [instanceId, nodeId]
        );

        if (allTasks.length === 0) return;

        switch (timeoutConfig.action) {
          case 'autoApprove':
            // 自动通过所有 pending 任务
            for (const task of allTasks) {
              await this.engine['updateTask'](task.id, {
                status: 'completed',
                comment: '超时自动通过',
                completedAt: new Date().toISOString(),
              });
            }
            // 触发后续流程
            await this.engine['handleExecutionResult'](instance, { success: true, waiting: false });
            break;

          case 'autoReject':
            // 自动驳回所有 pending 任务
            for (const task of allTasks) {
              await this.engine['updateTask'](task.id, {
                status: 'rejected',
                comment: '超时自动驳回',
                completedAt: new Date().toISOString(),
              });
            }
            // 更新实例状态
            await this.engine['updateInstance'](instanceId, { status: 'rejected' });
            break;

          case 'transfer':
            // 转办给指定人
            if (timeoutConfig.transferTo) {
              // 取消当前任务
              for (const task of allTasks) {
                await this.engine['updateTask'](task.id, { status: 'cancelled' });
              }
              // 创建新任务给转办人
              await this.engine['createTask']({
                instanceId,
                nodeId,
                assigneeId: timeoutConfig.transferTo,
                assigneeName: timeoutConfig.transferTo,
              });
            }
            break;

          case 'notify':
            // 通知（暂记录日志，通知服务未实现）
            break;
        }
      } catch (error) {
        // 超时处理失败不应中断流程
        console.error(`节点超时处理失败: ${instanceId}:${nodeId}`, error);
      }
    });
  }

  /**
   * 竞签认领 - 第一个认领的人获得任务，其他任务自动取消
   *
   * @param taskId 要认领的任务 ID
   * @param userId 认领人 ID
   * @param tasks 当前节点的所有任务
   * @returns 是否认领成功
   */
  async claim(taskId: string, userId: string, tasks: TaskRecord[]): Promise<boolean> {
    // 检查是否已有人认领
    const claimedTask = tasks.find(t =>
      t.status === 'claimed' || t.status === 'resolved' || t.status === 'rejected'
    );

    if (claimedTask) {
      // 已有人认领，认领失败
      return false;
    }

    // 认领成功，其他任务自动取消
    for (const task of tasks) {
      if (task.id === taskId) {
        // 更新为已认领状态
        await this.engine['updateTask'](task.id, {
          status: 'claimed',
          assigneeId: userId,
          claimedAt: new Date().toISOString(),
        });
      } else {
        // 取消其他任务
        await this.engine['updateTask'](task.id, {
          status: 'cancelled',
        });
      }
    }

    return true;
  }

  /**
   * 获取节点配置
   */
  getNodeConfig(node: FlowNode) {
    const approvalConfig = this.getApprovalConfig(node);
    return {
      type: 'bpmn:UserTask',
      waitForInput: true,
      timeout: approvalConfig.timeout?.duration,
      retryCount: 0,
      retryInterval: 0,
    };
  }
}
