/**
 * 网关执行器
 * 处理各种类型的网关（排他、并行、包含）
 */

import type {
  Gateway,
  ExclusiveGateway,
  ParallelGateway,
  InclusiveGateway,
  SequenceFlow,
  FlowNode,
  Edge,
} from '@low-code/workflow-bpmn';
import {
  isExclusiveGateway,
  isParallelGateway,
  isInclusiveGateway,
} from '@low-code/workflow-bpmn';
import { NodeExecutorBase } from './NodeExecutorBase';
import type {
  ExecutionContext,
  ExecutionResult,
  GatewayExecutionResult,
  NextNodeInfo,
} from '../types/execution';

/**
 * 网关执行器
 */
export class GatewayExecutor extends NodeExecutorBase {
  /**
   * 执行网关
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { currentNode } = context;

    // 根据网关类型选择执行策略
    if (isExclusiveGateway(currentNode)) {
      return this.executeExclusiveGateway(context);
    }

    if (isParallelGateway(currentNode)) {
      return this.executeParallelGateway(context);
    }

    if (isInclusiveGateway(currentNode)) {
      return this.executeInclusiveGateway(context);
    }

    return this.createErrorResult(`不支持的网关类型: ${currentNode.$type}`);
  }

  /**
   * 执行排他网关
   */
  private async executeExclusiveGateway(
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const { currentNode, definition, variables } = context;
    const gateway = currentNode as ExclusiveGateway;

    // 更新当前节点
    await this.engine['updateInstance'](context.instance.id, {
      currentNodeId: currentNode.id,
    });

    // 获取所有出口连线
    const outgoingEdges = definition.edges.filter((e: Edge) =>
      currentNode.outgoing?.includes(e.id)
    ) as SequenceFlow[];

    // 找到默认连线
    const defaultEdge = outgoingEdges.find((e: SequenceFlow) =>
      gateway.default === e.id ||
      e.conditionExpression?.body === 'default'
    );

    // 评估条件
    for (const edge of outgoingEdges) {
      if (edge === defaultEdge) continue;

      const condition = edge.conditionExpression;
      if (condition?.body) {
        try {
          const result = this.evaluateCondition(condition.body, variables);
          if (result) {
            const targetNode = definition.nodes.find((n: FlowNode) => n.id === edge.targetRef);
            if (targetNode) {
              return this.createSuccessResult([
                { node: targetNode, edge }
              ]);
            }
          }
        } catch (error) {
          // 条件求值失败，继续尝试下一个
        }
      }
    }

    // 使用默认连线
    if (defaultEdge) {
      const targetNode = definition.nodes.find((n: FlowNode) => n.id === defaultEdge.targetRef);
      if (targetNode) {
        return this.createSuccessResult([
          { node: targetNode, edge: defaultEdge }
        ]);
      }
    }

    return this.createErrorResult('排他网关没有满足条件的路径');
  }

  /**
   * 执行并行网关
   */
  private async executeParallelGateway(
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const { currentNode, definition } = context;
    const gateway = currentNode as ParallelGateway;

    // 更新当前节点
    await this.engine['updateInstance'](context.instance.id, {
      currentNodeId: currentNode.id,
    });

    // 检查是分支还是汇聚
    const incomingCount = currentNode.incoming?.length || 0;

    if (incomingCount <= 1) {
      // 分支：所有出口都需要执行
      const outgoingEdges = definition.edges.filter((e: Edge) =>
        currentNode.outgoing?.includes(e.id)
      );

      const nextNodes: NextNodeInfo[] = [];

      for (const edge of outgoingEdges) {
        const targetNode = definition.nodes.find((n: FlowNode) => n.id === edge.targetRef);
        if (targetNode) {
          nextNodes.push({ node: targetNode, edge });
        }
      }

      return this.createSuccessResult(nextNodes);
    } else {
      // 汇聚：等待所有分支完成
      return this.handleParallelJoin(context);
    }
  }

  /**
   * 执行包含网关
   */
  private async executeInclusiveGateway(
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const { currentNode, definition, variables } = context;
    const gateway = currentNode as InclusiveGateway;

    // 更新当前节点
    await this.engine['updateInstance'](context.instance.id, {
      currentNodeId: currentNode.id,
    });

    // 检查是分支还是汇聚
    const incomingCount = currentNode.incoming?.length || 0;

    if (incomingCount <= 1) {
      // 分支：评估每个条件，满足的都执行
      const outgoingEdges = definition.edges.filter((e: Edge) =>
        currentNode.outgoing?.includes(e.id)
      ) as SequenceFlow[];

      const nextNodes: NextNodeInfo[] = [];

      for (const edge of outgoingEdges) {
        const condition = edge.conditionExpression;
        if (condition?.body) {
          try {
            const result = this.evaluateCondition(condition.body, variables);
            if (result) {
              const targetNode = definition.nodes.find((n: FlowNode) => n.id === edge.targetRef);
              if (targetNode) {
                nextNodes.push({ node: targetNode, edge });
              }
            }
          } catch (error) {
            // 条件求值失败，跳过
          }
        } else {
          // 没有条件，视为默认路径
          const targetNode = definition.nodes.find((n: FlowNode) => n.id === edge.targetRef);
          if (targetNode) {
            nextNodes.push({ node: targetNode, edge });
          }
        }
      }

      if (nextNodes.length === 0) {
        return this.createErrorResult('包含网关没有满足条件的路径');
      }

      return this.createSuccessResult(nextNodes);
    } else {
      // 汇聚：等待所有活跃分支完成
      return this.handleParallelJoin(context);
    }
  }

  /**
   * 处理并行网关汇聚
   */
  private async handleParallelJoin(
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const { currentNode, instance } = context;

    // 检查是否有并行分支状态
    const checkpoint = instance.checkpoint as any;
    const parallelState = checkpoint?.parallelState;

    if (!parallelState) {
      // 初始化并行状态
      const incomingEdges = context.definition.edges.filter((e: Edge) =>
        currentNode.incoming?.includes(e.id)
      );

      // 记录等待状态
      await this.engine['saveCheckpoint'](instance.id, {
        instanceId: instance.id,
        nodeId: currentNode.id,
        nodeName: currentNode.name,
        status: 'waiting',
        timestamp: new Date().toISOString(),
        context: {},
        executionPath: [],
      });

      return this.createWaitingResult();
    }

    // 检查是否所有分支都完成
    if (parallelState.completedBranches.length < parallelState.activeBranches.length) {
      return this.createWaitingResult();
    }

    // 所有分支完成，继续执行
    const outgoingEdges = context.definition.edges.filter((e: Edge) =>
      currentNode.outgoing?.includes(e.id)
    );

    if (outgoingEdges.length === 1) {
      const targetNode = context.definition.nodes.find((n: FlowNode) => n.id === outgoingEdges[0].targetRef);
      if (targetNode) {
        return this.createSuccessResult([
          { node: targetNode, edge: outgoingEdges[0] }
        ]);
      }
    }

    return this.createCompletedResult();
  }

  /**
   * 评估条件
   */
  private evaluateCondition(expression: string, variables: Record<string, unknown>): boolean {
    // 处理 ${variable} 格式
    // 支持 ${amount <= 10000} 格式，只替换变量名部分
    const resolved = expression.replace(/\$\{([^}]+)\}/g, (match: string, varPath: string) => {
      // 提取变量名（第一个单词或点号分隔的路径）
      const varMatch = varPath.trim().match(/^([a-zA-Z_]\w*(?:\.\w+)*)\s*(.*)/);
      if (varMatch) {
        const [, varName, rest] = varMatch;
        const value = this.getNestedValue(variables, varName);
        if (value !== undefined) {
          return String(value) + (rest ? ' ' + rest : '');
        }
      }
      return match;
    });

    // 处理比较运算（优先匹配 >=, <=, !=, ==，然后再匹配 >, <）
    const comparisonMatch = resolved.match(/^(.+?)\s*(>=|<=|!=|==|>|<)\s*(.+)$/);
    if (comparisonMatch) {
      const [, left, op, right] = comparisonMatch;
      const leftValue = this.parseValue(left.trim());
      const rightValue = this.parseValue(right.trim());

      switch (op) {
        case '==': return leftValue == rightValue;
        case '!=': return leftValue != rightValue;
        case '>': return Number(leftValue) > Number(rightValue);
        case '>=': return Number(leftValue) >= Number(rightValue);
        case '<': return Number(leftValue) < Number(rightValue);
        case '<=': return Number(leftValue) <= Number(rightValue);
      }
    }

    // 处理逻辑运算
    const andMatch = resolved.match(/^(.+?)\s+and\s+(.+)$/);
    if (andMatch) {
      return this.evaluateCondition(andMatch[1].trim(), variables) &&
             this.evaluateCondition(andMatch[2].trim(), variables);
    }

    const orMatch = resolved.match(/^(.+?)\s+or\s+(.+)$/);
    if (orMatch) {
      return this.evaluateCondition(orMatch[1].trim(), variables) ||
             this.evaluateCondition(orMatch[2].trim(), variables);
    }

    const notMatch = resolved.match(/^not\s+(.+)$/);
    if (notMatch) {
      return !this.evaluateCondition(notMatch[1].trim(), variables);
    }

    // 处理常量
    if (resolved === 'true') return true;
    if (resolved === 'false') return false;

    // 默认返回 false
    return false;
  }

  /**
   * 解析值
   */
  private parseValue(value: string): unknown {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;

    const num = Number(value);
    if (!isNaN(num)) return num;

    // 处理字符串
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1);
    }

    return value;
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
  getNodeConfig(node: Gateway) {
    return {
      type: node.$type,
      waitForInput: false,
    };
  }
}
