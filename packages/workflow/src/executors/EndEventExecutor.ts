/**
 * 结束事件执行器
 */

import type { EndEvent } from '@low-code/workflow-bpmn';
import { isEndEvent } from '@low-code/workflow-bpmn';
import { NodeExecutorBase } from './NodeExecutorBase';
import type { ExecutionContext, ExecutionResult } from '../types/execution';

/**
 * 结束事件执行器
 * 处理流程的结束事件，完成流程实例
 */
export class EndEventExecutor extends NodeExecutorBase {
  /**
   * 执行结束事件
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { currentNode, instance } = context;

    // 校验节点类型
    if (!isEndEvent(currentNode)) {
      return this.createErrorResult('节点类型不是结束事件');
    }

    // 更新当前节点
    await this.engine['updateInstance'](instance.id, {
      currentNodeId: currentNode.id,
    });

    // 捕获终态快照
    if (instance.sourceTable && instance.sourceId) {
      await this.engine['snapshotEngine'].capture({
        instanceId: instance.id,
        nodeId: currentNode.id,
        nodeName: currentNode.name,
        sourceTable: instance.sourceTable,
        sourceId: instance.sourceId,
        data: instance.variables,
        snapshotType: 'FINAL',
      });

      // 回写业务表
      await this.engine['snapshotEngine'].commitToSourceTable(instance.id);
    }

    // 返回完成状态
    return this.createCompletedResult();
  }

  /**
   * 获取节点配置
   */
  getNodeConfig(node: EndEvent) {
    return {
      type: 'bpmn:EndEvent',
      waitForInput: false,
    };
  }
}
