/**
 * 开始事件执行器
 */

import type { StartEvent } from '@low-code/workflow-bpmn';
import { isStartEvent } from '@low-code/workflow-bpmn';
import { NodeExecutorBase } from './NodeExecutorBase';
import type { ExecutionContext, ExecutionResult } from '../types/execution';

/**
 * 开始事件执行器
 * 处理流程的开始事件，自动流转到下一个节点
 */
export class StartEventExecutor extends NodeExecutorBase {
  /**
   * 执行开始事件
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { currentNode, instance } = context;

    // 校验节点类型
    if (!isStartEvent(currentNode)) {
      return this.createErrorResult('节点类型不是开始事件');
    }

    // 更新当前节点
    await this.engine['updateInstance'](instance.id, {
      currentNodeId: currentNode.id,
    });

    // 获取下一个节点
    const nextNodes = this.getNextNodes(context);

    if (nextNodes.length === 0) {
      return this.createErrorResult('开始事件没有出口');
    }

    // 开始事件直接流转到下一个节点
    return this.createSuccessResult(nextNodes);
  }

  /**
   * 获取节点配置
   */
  getNodeConfig(node: StartEvent) {
    return {
      type: 'bpmn:StartEvent',
      waitForInput: false,
    };
  }
}
