/**
 * 延时节点执行器
 */

import type { FlowNode } from '@low-code/workflow-bpmn';
import { NodeExecutorBase } from './NodeExecutorBase';
import type { ExecutionContext, ExecutionResult } from '../types/execution';

/** 延时配置 */
interface TimerConfig {
  /** 延时时长（毫秒） */
  duration?: number;
  /** 定时执行时间 */
  executeAt?: string;
  /** Cron 表达式 */
  cron?: string;
  /** 超时动作 */
  timeoutAction?: 'continue' | 'fail' | 'notify';
}

/**
 * 延时节点执行器
 * 处理定时等待、超时等场景
 */
export class TimerExecutor extends NodeExecutorBase {
  /**
   * 执行延时节点
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { currentNode, instance } = context;

    // 更新当前节点
    await this.engine['updateInstance'](instance.id, {
      currentNodeId: currentNode.id,
    });

    // 获取延时配置
    const timerConfig = this.getTimerConfig(currentNode);

    // 计算执行时间
    const executeTime = this.calculateExecuteTime(timerConfig);

    if (!executeTime) {
      return this.createErrorResult('无法计算延时执行时间');
    }

    // 保存检查点
    await this.engine['saveCheckpoint'](instance.id, {
      instanceId: instance.id,
      nodeId: currentNode.id,
      nodeName: currentNode.name,
      status: 'waiting',
      timestamp: new Date().toISOString(),
      context: {
        timerConfig,
        executeTime: executeTime.toISOString(),
      },
      executionPath: [],
    });

    // 设置定时器
    this.scheduleTimer(instance.id, currentNode.id, executeTime);

    // 返回等待状态
    return this.createWaitingResult();
  }

  /**
   * 获取延时配置
   */
  private getTimerConfig(node: FlowNode): TimerConfig {
    const extension = node.extensionElements as any;
    return extension?.timerConfig || {};
  }

  /**
   * 计算执行时间
   */
  private calculateExecuteTime(config: TimerConfig): Date | null {
    const now = new Date();

    if (config.executeAt) {
      // 指定执行时间
      return new Date(config.executeAt);
    }

    if (config.duration) {
      // 延时时长
      return new Date(now.getTime() + config.duration);
    }

    if (config.cron) {
      // Cron 表达式（简化处理）
      // 实际应该使用 cron 解析库
      return new Date(now.getTime() + 60000); // 默认 1 分钟后
    }

    return null;
  }

  /**
   * 设置定时器
   */
  private scheduleTimer(instanceId: string, nodeId: string, executeTime: Date): void {
    const delay = executeTime.getTime() - Date.now();

    if (delay <= 0) {
      // 立即执行
      this.executeTimerCallback(instanceId, nodeId);
      return;
    }

    // 设置延时
    setTimeout(() => {
      this.executeTimerCallback(instanceId, nodeId);
    }, delay);
  }

  /**
   * 执行定时器回调
   */
  private async executeTimerCallback(instanceId: string, nodeId: string): Promise<void> {
    try {
      // 获取实例
      const instance = await this.engine.getInstance(instanceId);
      if (!instance || instance.status !== 'waiting') {
        return;
      }

      // 检查当前节点是否仍然是延时节点
      if (instance.currentNodeId !== nodeId) {
        return;
      }

      // 恢复执行
      await this.engine['updateInstance'](instanceId, {
        status: 'running',
      });

      // 清除检查点
      await this.engine['clearCheckpoint'](instanceId);

      // 获取下一个节点并执行
      const definition = await this.engine.getDefinitionById(instance.workflowDefId);
      if (definition) {
        const process = definition.schema.processes[0];
        const currentNode = process.nodes.find(n => n.id === nodeId);
        if (currentNode) {
          const nextNodes = this.getNextNodes({
            instance,
            definition: process,
            currentNode,
            variables: instance.variables,
          });

          if (nextNodes.length > 0) {
            // 继续执行下一个节点
            const result = this.createSuccessResult(nextNodes);
            await this.engine['handleExecutionResult'](instance, result);
          }
        }
      }
    } catch (error) {
      console.error('定时器执行失败:', error);
    }
  }

  /**
   * 获取节点配置
   */
  getNodeConfig(node: FlowNode) {
    const timerConfig = this.getTimerConfig(node);
    const executeTime = this.calculateExecuteTime(timerConfig);

    return {
      type: 'bpmn:TimerEvent',
      waitForInput: true,
      timeout: executeTime ? executeTime.getTime() - Date.now() : undefined,
    };
  }
}
