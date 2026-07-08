/**
 * 脚本任务执行器
 *
 * 复用表达式引擎执行同步计算表达式，结果写入流程变量。
 * 设计器保存的字段：expression（表达式字符串）
 * BPMN 标准字段：script（脚本内容）、resultVariable（结果变量名）
 */

import type { FlowNode } from '../schema';
import { NodeExecutorBase } from './NodeExecutorBase';
import type { ExecutionContext, ExecutionResult } from '../types/execution';
import { ConditionExpressionEvaluator } from '../engine/ExpressionEvaluator';

/** 脚本任务配置 */
interface ScriptTaskConfig {
  /** 表达式（设计器保存） */
  expression?: string;
  /** 脚本内容（BPMN 标准） */
  script?: string;
  /** 结果变量名 */
  resultVariable?: string;
}

/**
 * 脚本任务执行器
 * 同步执行表达式，结果写入流程变量
 */
export class ScriptTaskExecutor extends NodeExecutorBase {
  private readonly evaluator = new ConditionExpressionEvaluator();

  /**
   * 执行脚本任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { currentNode, instance, variables } = context;

    // 更新当前节点
    await this.engine['updateInstance'](instance.id, {
      currentNodeId: currentNode.id,
    });

    // 获取脚本配置
    const config = this.getScriptConfig(currentNode);
    const expression = config.expression || config.script;

    if (!expression) {
      return this.createErrorResult('脚本任务未配置表达式');
    }

    try {
      // 执行表达式
      const result = this.evaluator.evaluate(expression, {
        variables,
        currentNodeId: currentNode.id,
      });

      // 构建变量更新
      const variableUpdates: Record<string, unknown> = {};
      const resultKey = config.resultVariable || currentNode.id;
      variableUpdates[resultKey] = result;

      // 合并到流程变量
      await this.engine['mergeVariables'](instance.id, variableUpdates);

      // 获取下一个节点
      const nextNodes = this.getNextNodes(context);

      return {
        success: true,
        nextNodes,
        variableUpdates,
      };
    } catch (error) {
      return this.createErrorResult(
        `脚本执行失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 获取脚本配置
   * 优先读取顶层字段（设计器保存），回退到 extensionElements
   */
  private getScriptConfig(node: FlowNode): ScriptTaskConfig {
    const anyNode = node as any;
    return {
      expression: anyNode.expression,
      script: anyNode.script,
      resultVariable: anyNode.resultVariable,
    };
  }

  /**
   * 获取节点配置
   */
  getNodeConfig(node: FlowNode) {
    return {
      type: 'bpmn:ScriptTask',
      waitForInput: false,
      retryCount: 0,
      retryInterval: 0,
    };
  }
}
