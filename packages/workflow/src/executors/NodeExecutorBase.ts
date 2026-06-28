/**
 * 节点执行器基类
 */

import type { FlowNode, Edge } from '@low-code/workflow-bpmn';
import type {
  NodeExecutor,
  ExecutionContext,
  ExecutionResult,
  NodeConfig,
  NextNodeInfo,
  TaskCreateParams,
} from '../types/execution';
import type { WorkflowEngine } from '../engine/WorkflowEngine';

/**
 * 节点执行器基类
 */
export abstract class NodeExecutorBase implements NodeExecutor {
  constructor(protected readonly engine: WorkflowEngine) {}

  /**
   * 执行节点（子类实现）
   */
  abstract execute(context: ExecutionContext): Promise<ExecutionResult>;

  /**
   * 判断是否可以推进
   */
  async canAdvance(context: ExecutionContext): Promise<boolean> {
    return true;
  }

  /**
   * 获取节点配置
   */
  getNodeConfig(node: FlowNode): NodeConfig {
    return {
      type: node.$type,
      waitForInput: false,
    };
  }

  /**
   * 获取下一个节点
   */
  protected getNextNodes(context: ExecutionContext): NextNodeInfo[] {
    const { currentNode, definition } = context;

    const outgoingEdges = definition.edges.filter(e =>
      currentNode.outgoing?.includes(e.id)
    );

    return outgoingEdges
      .map((edge: Edge) => {
        const targetNode = definition.nodes.find((n: FlowNode) => n.id === edge.targetRef);
        if (!targetNode) return null;
        const info: NextNodeInfo = {
          node: targetNode,
          edge,
          conditionExpression: (edge as any).conditionExpression?.body as string | undefined,
        };
        return info;
      })
      .filter((n): n is NextNodeInfo => n !== null);
  }

  /**
   * 获取入口连线
   */
  protected getIncomingEdges(context: ExecutionContext): Edge[] {
    const { currentNode, definition } = context;

    return definition.edges.filter((e: Edge) =>
      currentNode.incoming?.includes(e.id)
    );
  }

  /**
   * 创建成功结果
   */
  protected createSuccessResult(
    nextNodes?: NextNodeInfo[],
    tasks?: TaskCreateParams[],
    waiting?: boolean
  ): ExecutionResult {
    return {
      success: true,
      nextNodes,
      tasks,
      waiting,
    };
  }

  /**
   * 创建失败结果
   */
  protected createErrorResult(error: string): ExecutionResult {
    return {
      success: false,
      error,
    };
  }

  /**
   * 创建等待结果
   */
  protected createWaitingResult(): ExecutionResult {
    return {
      success: true,
      waiting: true,
    };
  }

  /**
   * 创建完成结果
   */
  protected createCompletedResult(): ExecutionResult {
    return {
      success: true,
      completed: true,
    };
  }
}
