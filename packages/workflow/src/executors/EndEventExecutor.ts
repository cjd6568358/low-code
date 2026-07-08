/**
 * 结束事件执行器
 *
 * 处理流程的结束事件，完成流程实例。
 * 支持输出定义：结束节点可配置 output 字段，
 * 用于定义终态快照的数据内容。
 */

import type { EndEvent } from '../schema';
import { isEndEvent } from '../schema';
import { NodeExecutorBase } from './NodeExecutorBase';
import type { ExecutionContext, ExecutionResult } from '../types/execution';

/** 结束事件配置 */
interface EndEventConfig {
  /** 输出值定义（支持变量模板） */
  output?: Record<string, unknown>;
  /** 结束状态 */
  endStatus?: 'resolved' | 'failed';
}

/**
 * 结束事件执行器
 */
export class EndEventExecutor extends NodeExecutorBase {
  /**
   * 执行结束事件
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { currentNode, instance, variables } = context;

    if (!isEndEvent(currentNode)) {
      return this.createErrorResult('节点类型不是结束事件');
    }

    // 获取结束节点配置
    const config = this.getEndConfig(currentNode);

    // 更新当前节点
    await this.engine['updateInstance'](instance.id, {
      currentNodeId: currentNode.id,
    });

    // 解析输出值
    const outputData = config.output
      ? this.resolveOutput(config.output, variables)
      : variables;

    // 捕获终态快照（包含输出值）
    if (instance.sourceTable && instance.sourceId) {
      await this.engine['snapshotEngine'].capture({
        instanceId: instance.id,
        nodeId: currentNode.id,
        nodeName: currentNode.name,
        sourceTable: instance.sourceTable,
        sourceId: instance.sourceId,
        data: outputData,
        snapshotType: 'FINAL',
      });

      // 回写业务表
      await this.engine['snapshotEngine'].commitToSourceTable(instance.id);
    }

    // 返回完成状态
    return this.createCompletedResult();
  }

  /**
   * 获取结束节点配置
   */
  private getEndConfig(node: EndEvent): EndEventConfig {
    const extension = node.extensionElements as any;
    return extension?.endConfig || {};
  }

  /**
   * 解析输出值
   * 支持 ${variable} 模板语法
   */
  private resolveOutput(
    output: Record<string, unknown>,
    variables: Record<string, unknown>
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(output)) {
      if (typeof value === 'string') {
        resolved[key] = this.resolveTemplate(value, variables);
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveOutput(value as Record<string, unknown>, variables);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * 解析模板字符串
   */
  private resolveTemplate(template: string, variables: Record<string, unknown>): unknown {
    // 完整变量引用：${variable} → 直接返回值（保留类型）
    const fullMatch = template.match(/^\$\{([^}]+)\}$/);
    if (fullMatch) {
      const varPath = fullMatch[1].trim();
      return this.getNestedValue(variables, varPath);
    }

    // 部分变量引用：xxx${variable}yyy → 字符串拼接
    return template.replace(/\$\{([^}]+)\}/g, (match, varPath) => {
      const value = this.getNestedValue(variables, varPath.trim());
      return value != null ? String(value) : match;
    });
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
  getNodeConfig(node: EndEvent) {
    return {
      type: 'bpmn:EndEvent',
      waitForInput: false,
      retryCount: 0,
      retryInterval: 0,
    };
  }
}
