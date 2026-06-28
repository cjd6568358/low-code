/**
 * 流程引擎主类
 * 负责流程实例的生命周期管理
 */

import type {
  BpmnDocument,
  ProcessDefinition,
  FlowNode,
  Edge,
  ProcessInstance,
  ApprovalTask,
  WorkflowSnapshot,
} from '@low-code/workflow-bpmn';
import {
  isStartEvent,
  isEndEvent,
  isUserTask,
  isGateway,
  isExclusiveGateway,
  isParallelGateway,
  isInclusiveGateway,
  isSubProcess,
  isBoundaryEvent,
  validateBpmnDocument,
  deserializeBpmnDocument,
} from '@low-code/workflow-bpmn';
import type {
  WorkflowEngineConfig,
  DatabaseAdapter,
  SnapshotService,
  NotifyService,
  ExpressionEvaluator,
  StartParams,
  CompleteParams,
  RejectParams,
  TerminateParams,
  InstanceRecord,
  TaskRecord,
  DefinitionRecord,
  CheckpointRecord,
} from '../types/engine';
import type {
  ExecutionContext,
  ExecutionResult,
  NodeExecutor,
  ProcessState,
} from '../types/execution';
import { StateMachine } from './StateMachine';
import { SnapshotEngine } from '../snapshot/SnapshotEngine';
import { RecoveryManager } from '../recovery/RecoveryManager';
import { StartEventExecutor } from '../executors/StartEventExecutor';
import { EndEventExecutor } from '../executors/EndEventExecutor';
import { UserTaskExecutor } from '../executors/UserTaskExecutor';
import { GatewayExecutor } from '../executors/GatewayExecutor';
import { TimerExecutor } from '../executors/TimerExecutor';
import { ServiceTaskExecutor } from '../executors/ServiceTaskExecutor';

/** 流程引擎错误码 */
export type WorkflowErrorCode =
  | 'DEFINITION_NOT_FOUND'
  | 'INSTANCE_NOT_FOUND'
  | 'TASK_NOT_FOUND'
  | 'INVALID_STATE'
  | 'NODE_EXECUTION_FAILED'
  | 'CONDITION_EVALUATION_FAILED'
  | 'NO_EXECUTABLE_PATH'
  | 'PARALLEL_JOIN_TIMEOUT'
  | 'RECOVERY_FAILED';

/** 流程引擎错误码常量 */
export const WorkflowErrorCode = {
  DEFINITION_NOT_FOUND: 'DEFINITION_NOT_FOUND' as WorkflowErrorCode,
  INSTANCE_NOT_FOUND: 'INSTANCE_NOT_FOUND' as WorkflowErrorCode,
  TASK_NOT_FOUND: 'TASK_NOT_FOUND' as WorkflowErrorCode,
  INVALID_STATE: 'INVALID_STATE' as WorkflowErrorCode,
  NODE_EXECUTION_FAILED: 'NODE_EXECUTION_FAILED' as WorkflowErrorCode,
  CONDITION_EVALUATION_FAILED: 'CONDITION_EVALUATION_FAILED' as WorkflowErrorCode,
  NO_EXECUTABLE_PATH: 'NO_EXECUTABLE_PATH' as WorkflowErrorCode,
  PARALLEL_JOIN_TIMEOUT: 'PARALLEL_JOIN_TIMEOUT' as WorkflowErrorCode,
  RECOVERY_FAILED: 'RECOVERY_FAILED' as WorkflowErrorCode,
};

/** 流程引擎错误 */
export class WorkflowError extends Error {
  constructor(
    public code: WorkflowErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

/**
 * 流程引擎主类
 */
export class WorkflowEngine {
  private readonly db: DatabaseAdapter;
  private readonly snapshotEngine: SnapshotEngine;
  private readonly stateMachine: StateMachine;
  private readonly recoveryManager: RecoveryManager;
  private readonly notifyService?: NotifyService;
  private readonly expressionEvaluator?: ExpressionEvaluator;
  private readonly nodeExecutors = new Map<string, NodeExecutor>();

  constructor(config: WorkflowEngineConfig) {
    this.db = config.db;
    this.snapshotEngine = new SnapshotEngine(config.snapshotService);
    this.stateMachine = new StateMachine();
    this.recoveryManager = new RecoveryManager(config.db, this);
    this.notifyService = config.notifyService;
    this.expressionEvaluator = config.expressionEvaluator;

    // 注册默认节点执行器
    this.registerDefaultExecutors();
  }

  /**
   * 注册节点执行器
   */
  registerExecutor(nodeType: string, executor: NodeExecutor): void {
    this.nodeExecutors.set(nodeType, executor);
  }

  /**
   * 启动流程实例
   */
  async start(params: StartParams): Promise<InstanceRecord> {
    // 1. 获取流程定义
    const definition = await this.getDefinition(params.workflowId, params.version);
    if (!definition) {
      throw new WorkflowError(
        WorkflowErrorCode.DEFINITION_NOT_FOUND,
        `流程定义不存在: ${params.workflowId}`
      );
    }

    // 2. 解析 BPMN 文档
    const bpmnDoc = definition.schema;
    const process = bpmnDoc.processes[0];
    if (!process) {
      throw new WorkflowError(
        WorkflowErrorCode.DEFINITION_NOT_FOUND,
        '流程定义中没有流程'
      );
    }

    // 3. 找到开始事件
    const startEvent = process.nodes.find((n: FlowNode) => isStartEvent(n));
    if (!startEvent) {
      throw new WorkflowError(
        WorkflowErrorCode.DEFINITION_NOT_FOUND,
        '流程中没有开始事件'
      );
    }

    // 4. 创建流程实例
    const instance = await this.createInstance({
      workflowDefId: definition.id,
      workflowKey: definition.workflowKey,
      version: definition.version,
      sourceTable: params.sourceTable,
      sourceId: params.sourceId,
      variables: params.variables || {},
      status: 'running',
      startedBy: params.startedBy,
      startedByName: params.startedByName,
    });

    // 5. 捕获初始快照
    if (params.sourceTable && params.sourceId) {
      await this.snapshotEngine.capture({
        instanceId: instance.id,
        sourceTable: params.sourceTable,
        sourceId: params.sourceId,
        data: params.variables || {},
        snapshotType: 'INITIAL',
        operatorId: params.startedBy,
        operatorName: params.startedByName,
      });
    }

    // 6. 执行开始事件
    const context: ExecutionContext = {
      instance,
      definition: process,
      currentNode: startEvent,
      variables: params.variables || {},
      initiator: {
        id: params.startedBy,
        name: params.startedByName || '',
      },
    };

    const result = await this.executeNode(context);

    // 7. 处理执行结果
    await this.handleExecutionResult(instance, result);

    // 8. 发送通知
    await this.notifyWorkflowStarted(instance);

    return instance;
  }

  /**
   * 完成任务（审批通过）
   */
  async complete(params: CompleteParams): Promise<InstanceRecord> {
    // 1. 获取任务
    const task = await this.getTask(params.taskId);
    if (!task) {
      throw new WorkflowError(
        WorkflowErrorCode.TASK_NOT_FOUND,
        `任务不存在: ${params.taskId}`
      );
    }

    // 2. 校验任务状态
    if (task.status !== 'pending') {
      throw new WorkflowError(
        WorkflowErrorCode.INVALID_STATE,
        `任务状态不是待处理: ${task.status}`
      );
    }

    // 3. 校验操作人权限
    await this.validateTaskPermission(task, params.operatorId);

    // 4. 获取流程实例
    const instance = await this.getInstance(task.instanceId);
    if (!instance || (instance.status !== 'running' && instance.status !== 'waiting')) {
      throw new WorkflowError(
        WorkflowErrorCode.INSTANCE_NOT_FOUND,
        `流程实例不存在或状态异常: ${task.instanceId}`
      );
    }

    // 5. 获取流程定义
    const definition = await this.getDefinitionById(instance.workflowDefId);
    if (!definition) {
      throw new WorkflowError(
        WorkflowErrorCode.DEFINITION_NOT_FOUND,
        `流程定义不存在: ${instance.workflowDefId}`
      );
    }

    const process = definition.schema.processes[0];
    const node = process.nodes.find((n: FlowNode) => n.id === task.nodeId);
    if (!node) {
      throw new WorkflowError(
        WorkflowErrorCode.NODE_EXECUTION_FAILED,
        `节点不存在: ${task.nodeId}`
      );
    }

    // 6. 更新任务状态
    await this.updateTask(params.taskId, {
      status: 'completed',
      formData: params.formData,
      comment: params.comment,
      completedAt: new Date().toISOString(),
    });

    // 7. 更新流程变量
    if (params.formData) {
      await this.mergeVariables(instance.id, params.formData);
    }

    // 8. 检查是否为会签/或签
    if (isUserTask(node)) {
      const approvalResult = await this.checkApprovalMode(task, node);
      if (!approvalResult.completed) {
        // 会签/或签未完成，等待其他审批
        return instance;
      }
    }

    // 9. 捕获节点完成快照
    const latestSnapshot = await this.snapshotEngine.getLatest(instance.id);
    await this.snapshotEngine.capture({
      instanceId: instance.id,
      nodeId: task.nodeId,
      nodeName: task.nodeName,
      sourceTable: instance.sourceTable || '',
      sourceId: instance.sourceId || '',
      data: { ...instance.variables, ...params.formData },
      snapshotType: 'NODE_COMPLETE',
      operatorId: params.operatorId,
      operatorName: params.operatorName,
      comment: params.comment,
      previousSnapshotId: latestSnapshot?.id,
    });

    // 10. 执行节点后续逻辑
    const context: ExecutionContext = {
      instance,
      definition: process,
      currentNode: node,
      variables: { ...instance.variables, ...params.formData },
      operator: {
        id: params.operatorId,
        name: params.operatorName || '',
      },
      formData: params.formData,
    };

    const result = await this.executeNodePostLogic(context);
    await this.handleExecutionResult(instance, result);

    // 11. 发送通知
    await this.notifyTaskCompleted(task, params);

    // 12. 返回更新后的实例
    const updatedInstance = await this.getInstance(instance.id);
    return updatedInstance || instance;
  }

  /**
   * 驳回任务
   */
  async reject(params: RejectParams): Promise<InstanceRecord> {
    // 1. 获取任务
    const task = await this.getTask(params.taskId);
    if (!task) {
      throw new WorkflowError(
        WorkflowErrorCode.TASK_NOT_FOUND,
        `任务不存在: ${params.taskId}`
      );
    }

    // 2. 校验任务状态
    if (task.status !== 'pending') {
      throw new WorkflowError(
        WorkflowErrorCode.INVALID_STATE,
        `任务状态不是待处理: ${task.status}`
      );
    }

    // 3. 获取流程实例和定义
    const instance = await this.getInstance(task.instanceId);
    if (!instance) {
      throw new WorkflowError(
        WorkflowErrorCode.INSTANCE_NOT_FOUND,
        `流程实例不存在: ${task.instanceId}`
      );
    }

    const definition = await this.getDefinitionById(instance.workflowDefId);
    if (!definition) {
      throw new WorkflowError(
        WorkflowErrorCode.DEFINITION_NOT_FOUND,
        `流程定义不存在: ${instance.workflowDefId}`
      );
    }

    const process = definition.schema.processes[0];
    const node = process.nodes.find((n: FlowNode) => n.id === task.nodeId);
    if (!node) {
      throw new WorkflowError(
        WorkflowErrorCode.NODE_EXECUTION_FAILED,
        `节点不存在: ${task.nodeId}`
      );
    }

    // 4. 更新任务状态
    await this.updateTask(params.taskId, {
      status: 'rejected',
      comment: params.comment,
      completedAt: new Date().toISOString(),
    });

    // 5. 捕获驳回快照
    await this.snapshotEngine.capture({
      instanceId: instance.id,
      nodeId: task.nodeId,
      nodeName: task.nodeName,
      sourceTable: instance.sourceTable || '',
      sourceId: instance.sourceId || '',
      data: instance.variables,
      snapshotType: 'NODE_REJECT',
      operatorId: params.operatorId,
      operatorName: params.operatorName,
      comment: params.comment,
    });

    // 6. 处理驳回逻辑
    await this.handleReject(instance, node, params);

    // 7. 发送通知
    await this.notifyTaskRejected(task, params);

    return instance;
  }

  /**
   * 终止流程
   */
  async terminate(params: TerminateParams): Promise<InstanceRecord> {
    const instance = await this.getInstance(params.instanceId);
    if (!instance) {
      throw new WorkflowError(
        WorkflowErrorCode.INSTANCE_NOT_FOUND,
        `流程实例不存在: ${params.instanceId}`
      );
    }

    if (instance.status !== 'running' && instance.status !== 'waiting') {
      throw new WorkflowError(
        WorkflowErrorCode.INVALID_STATE,
        `流程状态不允许终止: ${instance.status}`
      );
    }

    // 更新实例状态
    await this.updateInstance(params.instanceId, {
      status: 'terminated',
      completedAt: new Date().toISOString(),
    });

    // 取消所有待办任务
    await this.cancelPendingTasks(params.instanceId);

    // 捕获终止快照
    if (instance.sourceTable && instance.sourceId) {
      await this.snapshotEngine.capture({
        instanceId: params.instanceId,
        sourceTable: instance.sourceTable,
        sourceId: instance.sourceId,
        data: instance.variables,
        snapshotType: 'TERMINATED',
        operatorId: params.operatorId,
        operatorName: params.operatorName,
        comment: params.reason,
      });
    }

    // 发送通知
    await this.notifyWorkflowTerminated(instance, params);

    return instance;
  }

  /**
   * 恢复中断的流程
   */
  async recover(instanceId: string): Promise<InstanceRecord> {
    return this.recoveryManager.recover(instanceId);
  }

  /**
   * 批量恢复中断的流程
   */
  async recoverAll(): Promise<number> {
    return this.recoveryManager.recoverAll();
  }

  /**
   * 获取流程实例详情
   */
  async getInstance(instanceId: string): Promise<InstanceRecord | undefined> {
    return this.db.get<InstanceRecord>(
      'SELECT * FROM workflow_instances WHERE id = ?',
      [instanceId]
    );
  }

  /**
   * 获取任务详情
   */
  async getTask(taskId: string): Promise<TaskRecord | undefined> {
    return this.db.get<TaskRecord>(
      'SELECT * FROM workflow_tasks WHERE id = ?',
      [taskId]
    );
  }

  /**
   * 获取待办任务列表
   */
  async getPendingTasks(assigneeId: string): Promise<TaskRecord[]> {
    const result = await this.db.all<TaskRecord>(
      'SELECT * FROM workflow_tasks WHERE assignee_id = ? AND status = ? ORDER BY created_at DESC',
      [assigneeId, 'pending']
    );
    return result;
  }

  /**
   * 获取流程定义
   */
  async getDefinition(workflowKey: string, version?: number): Promise<DefinitionRecord | undefined> {
    if (version) {
      return this.db.get<DefinitionRecord>(
        `SELECT * FROM workflow_definitions
         WHERE workflow_key = ? AND version = ? AND status = 'PUBLISHED'`,
        [workflowKey, version]
      );
    }

    return this.db.get<DefinitionRecord>(
      `SELECT * FROM workflow_definitions
       WHERE workflow_key = ? AND status = 'PUBLISHED'
       ORDER BY version DESC LIMIT 1`,
      [workflowKey]
    );
  }

  /**
   * 根据 ID 获取流程定义
   */
  async getDefinitionById(definitionId: string): Promise<DefinitionRecord | undefined> {
    return this.db.get<DefinitionRecord>(
      'SELECT * FROM workflow_definitions WHERE id = ?',
      [definitionId]
    );
  }

  // ==================== 私有方法 ====================

  /**
   * 执行节点
   */
  private async executeNode(context: ExecutionContext): Promise<ExecutionResult> {
    const { currentNode } = context;
    const executor = this.nodeExecutors.get(currentNode.$type);

    if (!executor) {
      throw new WorkflowError(
        WorkflowErrorCode.NODE_EXECUTION_FAILED,
        `没有找到节点执行器: ${currentNode.$type}`
      );
    }

    try {
      return await executor.execute(context);
    } catch (error) {
      throw new WorkflowError(
        WorkflowErrorCode.NODE_EXECUTION_FAILED,
        `节点执行失败: ${currentNode.name || currentNode.id}`,
        error
      );
    }
  }

  /**
   * 执行节点后续逻辑（任务完成后）
   */
  private async executeNodePostLogic(context: ExecutionContext): Promise<ExecutionResult> {
    const { currentNode, definition } = context;

    // 找到出口连线
    const outgoingEdges = definition.edges.filter((e: Edge) =>
      currentNode.outgoing?.includes(e.id)
    );

    if (outgoingEdges.length === 0) {
      // 没有出口，可能是结束节点
      return { success: true, completed: true };
    }

    // 单出口
    if (outgoingEdges.length === 1) {
      const targetNode = definition.nodes.find((n: FlowNode) => n.id === outgoingEdges[0].targetRef);
      if (!targetNode) {
        throw new WorkflowError(
          WorkflowErrorCode.NODE_EXECUTION_FAILED,
          `目标节点不存在: ${outgoingEdges[0].targetRef}`
        );
      }

      // 继续执行下一个节点
      const nextContext: ExecutionContext = {
        ...context,
        currentNode: targetNode,
      };
      return this.executeNode(nextContext);
    }

    // 多出口（条件网关）
    return this.evaluateGateway(context, outgoingEdges);
  }

  /**
   * 评估网关
   */
  private async evaluateGateway(
    context: ExecutionContext,
    edges: Edge[]
  ): Promise<ExecutionResult> {
    const { currentNode, variables } = context;

    // 排他网关
    if (isExclusiveGateway(currentNode)) {
      return this.evaluateExclusiveGateway(context, edges);
    }

    // 并行网关
    if (isParallelGateway(currentNode)) {
      return this.evaluateParallelGateway(context, edges);
    }

    // 包含网关
    if (isInclusiveGateway(currentNode)) {
      return this.evaluateInclusiveGateway(context, edges);
    }

    throw new WorkflowError(
      WorkflowErrorCode.NODE_EXECUTION_FAILED,
      `不支持的网关类型: ${currentNode.$type}`
    );
  }

  /**
   * 评估排他网关
   */
  private async evaluateExclusiveGateway(
    context: ExecutionContext,
    edges: Edge[]
  ): Promise<ExecutionResult> {
    const { variables, definition } = context;

    // 找到默认连线
    const defaultEdge = edges.find((e: Edge) =>
      (e as any).conditionExpression?.body === 'default' ||
      (context.currentNode as any).default === e.id
    );

    // 评估条件
    for (const edge of edges) {
      if (edge === defaultEdge) continue;

      const condition = (edge as any).conditionExpression;
      if (condition && this.expressionEvaluator) {
        try {
          const result = this.expressionEvaluator.evaluateBoolean(condition.body, { variables });
          if (result) {
            const targetNode = definition.nodes.find((n: FlowNode) => n.id === edge.targetRef);
            if (targetNode) {
              return {
                success: true,
                nextNodes: [{ node: targetNode, edge }],
              };
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
        return {
          success: true,
          nextNodes: [{ node: targetNode, edge: defaultEdge }],
        };
      }
    }

    throw new WorkflowError(
      WorkflowErrorCode.NO_EXECUTABLE_PATH,
      '没有可执行的路径'
    );
  }

  /**
   * 评估并行网关
   */
  private async evaluateParallelGateway(
    context: ExecutionContext,
    edges: Edge[]
  ): Promise<ExecutionResult> {
    const { definition, currentNode } = context;

    // 检查是分支还是汇聚
    const incomingCount = currentNode.incoming?.length || 0;

    if (incomingCount <= 1) {
      // 分支：所有出口都需要执行
      const nextNodes = edges.map((edge: Edge) => {
        const targetNode = definition.nodes.find((n: FlowNode) => n.id === edge.targetRef);
        return { node: targetNode!, edge };
      }).filter((item: { node: FlowNode; edge: Edge }) => item.node);

      return {
        success: true,
        nextNodes,
      };
    } else {
      // 汇聚：等待所有分支完成
      return this.handleParallelJoin(context);
    }
  }

  /**
   * 处理并行网关汇聚
   */
  private async handleParallelJoin(context: ExecutionContext): Promise<ExecutionResult> {
    const { instance, currentNode } = context;

    // 检查所有入口分支是否都已完成
    const checkpoint = instance.checkpoint as any;
    const parallelState = checkpoint?.parallelState;

    if (!parallelState) {
      // 初始化并行状态
      const incomingEdges = context.definition.edges.filter((e: Edge) =>
        currentNode.incoming?.includes(e.id)
      );

      return {
        success: true,
        waiting: true,
        // 需要记录等待状态
      };
    }

    // 检查是否所有分支都完成
    if (parallelState.completedBranches.length < parallelState.activeBranches.length) {
      return {
        success: true,
        waiting: true,
      };
    }

    // 所有分支完成，继续执行
    const outgoingEdges = context.definition.edges.filter((e: Edge) =>
      currentNode.outgoing?.includes(e.id)
    );

    if (outgoingEdges.length === 1) {
      const targetNode = context.definition.nodes.find((n: FlowNode) => n.id === outgoingEdges[0].targetRef);
      if (targetNode) {
        const nextContext: ExecutionContext = {
          ...context,
          currentNode: targetNode,
        };
        return this.executeNode(nextContext);
      }
    }

    return { success: true, completed: true };
  }

  /**
   * 评估包含网关
   */
  private async evaluateInclusiveGateway(
    context: ExecutionContext,
    edges: Edge[]
  ): Promise<ExecutionResult> {
    const { variables, definition, currentNode } = context;

    // 检查是分支还是汇聚
    const incomingCount = currentNode.incoming?.length || 0;

    if (incomingCount <= 1) {
      // 分支：评估每个条件，满足的都执行
      const nextNodes: Array<{ node: FlowNode; edge: Edge }> = [];

      for (const edge of edges) {
        const condition = (edge as any).conditionExpression;
        if (condition && this.expressionEvaluator) {
          try {
            const result = this.expressionEvaluator.evaluateBoolean(condition.body, { variables });
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
        throw new WorkflowError(
          WorkflowErrorCode.NO_EXECUTABLE_PATH,
          '没有满足条件的路径'
        );
      }

      return {
        success: true,
        nextNodes,
      };
    } else {
      // 汇聚：等待所有活跃分支完成
      return this.handleParallelJoin(context);
    }
  }

  /**
   * 处理执行结果
   */
  private async handleExecutionResult(
    instance: InstanceRecord,
    result: ExecutionResult
  ): Promise<void> {
    if (!result.success) {
      await this.updateInstance(instance.id, { status: 'failed' });
      return;
    }

    if (result.completed) {
      // 流程完成
      await this.handleCompletion(instance);
      return;
    }

    // 先创建任务（即使 waiting 为 true）
    if (result.tasks && result.tasks.length > 0) {
      // 创建任务
      for (const taskParams of result.tasks) {
        await this.createTask({
          ...taskParams,
          instanceId: instance.id,
        });
      }
    }

    if (result.waiting) {
      // 等待外部输入
      await this.updateInstance(instance.id, { status: 'waiting' });
      return;
    }

    if (result.snapshot) {
      // 捕获快照
      await this.snapshotEngine.capture({
        ...result.snapshot,
        instanceId: instance.id,
        sourceTable: instance.sourceTable || '',
        sourceId: instance.sourceId || '',
      });
    }

    if (result.variableUpdates) {
      // 更新变量
      await this.mergeVariables(instance.id, result.variableUpdates);
    }

    if (result.nextNodes && result.nextNodes.length > 0) {
      // 继续执行下一个节点
      for (const { node } of result.nextNodes) {
        const definition = await this.getDefinitionById(instance.workflowDefId);
        if (definition) {
          const process = definition.schema.processes[0];
          const context: ExecutionContext = {
            instance,
            definition: process,
            currentNode: node,
            variables: instance.variables,
          };
          const nextResult = await this.executeNode(context);
          await this.handleExecutionResult(instance, nextResult);
        }
      }
    }
  }

  /**
   * 处理流程完成
   */
  private async handleCompletion(instance: InstanceRecord): Promise<void> {
    // 更新实例状态
    await this.updateInstance(instance.id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });

    // 回写业务表
    if (instance.sourceTable && instance.sourceId) {
      await this.snapshotEngine.capture({
        instanceId: instance.id,
        sourceTable: instance.sourceTable,
        sourceId: instance.sourceId,
        data: instance.variables,
        snapshotType: 'FINAL',
      });

      await this.snapshotEngine.commitToSourceTable(instance.id);
    }

    // 发送通知
    await this.notifyWorkflowCompleted(instance);
  }

  /**
   * 处理驳回
   */
  private async handleReject(
    instance: InstanceRecord,
    node: FlowNode,
    params: RejectParams
  ): Promise<void> {
    // 获取节点的驳回配置
    const rejectAction = (node as any).extensionElements?.approvalConfig?.rejectAction || 'rejectToStart';

    let targetNodeId: string | undefined;

    switch (rejectAction) {
      case 'rejectToStart':
        // 驳回到开始事件
        const process = instance.variables as any;
        const definition = await this.getDefinitionById(instance.workflowDefId);
        if (definition) {
          const startEvent = definition.schema.processes[0].nodes.find((n: FlowNode) => isStartEvent(n));
          targetNodeId = startEvent?.id;
        }
        break;
      case 'rejectToPrevious':
        // 驳回到上一个节点
        const snapshots = await this.snapshotEngine.getChain(instance.id);
        if (snapshots.length >= 2) {
          targetNodeId = snapshots[snapshots.length - 2].nodeId;
        }
        break;
      case 'rejectToNode':
        // 驳回到指定节点
        targetNodeId = params.targetNodeId;
        break;
      case 'rejectToEnd':
        // 直接结束
        await this.updateInstance(instance.id, {
          status: 'rejected',
          completedAt: new Date().toISOString(),
        });
        return;
    }

    if (targetNodeId) {
      // 更新当前节点
      await this.updateInstance(instance.id, {
        currentNodeId: targetNodeId,
        status: 'running',
      });

      // 重新执行目标节点
      const definition = await this.getDefinitionById(instance.workflowDefId);
      if (definition) {
        const process = definition.schema.processes[0];
        const targetNode = process.nodes.find((n: FlowNode) => n.id === targetNodeId);
        if (targetNode) {
          const context: ExecutionContext = {
            instance,
            definition: process,
            currentNode: targetNode,
            variables: instance.variables,
            operator: params.operatorId ? {
              id: params.operatorId,
              name: params.operatorName || '',
            } : undefined,
          };
          const result = await this.executeNode(context);
          await this.handleExecutionResult(instance, result);
        }
      }
    }
  }

  /**
   * 检查审批模式
   */
  private async checkApprovalMode(
    task: TaskRecord,
    node: FlowNode
  ): Promise<{ completed: boolean; result?: 'approved' | 'rejected' }> {
    const approvalConfig = (node as any).extensionElements?.approvalConfig;
    if (!approvalConfig) {
      return { completed: true, result: 'approved' };
    }

    const { mode } = approvalConfig;

    if (mode === 'single') {
      return { completed: true, result: 'approved' };
    }

    // 获取同节点的所有任务
    const allTasks = await this.db.all<TaskRecord>(
      `SELECT * FROM workflow_tasks
       WHERE instance_id = ? AND node_id = ?`,
      [task.instanceId, task.nodeId]
    );

    const completedTasks = allTasks.filter((t: TaskRecord) => t.status === 'completed');
    const rejectedTasks = allTasks.filter((t: TaskRecord) => t.status === 'rejected');

    if (mode === 'countersign') {
      // 会签：所有人必须同意
      if (rejectedTasks.length > 0) {
        return { completed: true, result: 'rejected' };
      }
      if (completedTasks.length >= allTasks.length) {
        return { completed: true, result: 'approved' };
      }
      return { completed: false };
    }

    if (mode === 'orSign') {
      // 或签：一人同意即可
      if (completedTasks.length > 0) {
        return { completed: true, result: 'approved' };
      }
      if (rejectedTasks.length >= allTasks.length) {
        return { completed: true, result: 'rejected' };
      }
      return { completed: false };
    }

    return { completed: true, result: 'approved' };
  }

  /**
   * 创建流程实例
   */
  private async createInstance(data: Partial<InstanceRecord>): Promise<InstanceRecord> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const instance: InstanceRecord = {
      id,
      workflowDefId: data.workflowDefId || '',
      workflowKey: data.workflowKey || '',
      version: data.version || 1,
      sourceTable: data.sourceTable,
      sourceId: data.sourceId,
      status: data.status || 'running',
      variables: data.variables || {},
      startedBy: data.startedBy || '',
      startedByName: data.startedByName,
      startedAt: now,
    };

    await this.db.run(
      `INSERT INTO workflow_instances (
        id, workflow_def_id, workflow_key, version,
        source_table, source_id, current_snapshot_id, current_node_id,
        status, variables, checkpoint,
        started_by, started_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        instance.id,
        instance.workflowDefId,
        instance.workflowKey,
        instance.version,
        instance.sourceTable,
        instance.sourceId,
        instance.currentSnapshotId,
        instance.currentNodeId,
        instance.status,
        JSON.stringify(instance.variables),
        instance.checkpoint ? JSON.stringify(instance.checkpoint) : null,
        instance.startedBy,
        instance.startedAt,
        instance.completedAt,
      ]
    );

    return instance;
  }

  /**
   * 更新流程实例
   */
  private async updateInstance(
    instanceId: string,
    data: Partial<InstanceRecord>
  ): Promise<void> {
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }
    if (data.currentNodeId !== undefined) {
      updates.push('current_node_id = ?');
      params.push(data.currentNodeId);
    }
    if (data.currentSnapshotId !== undefined) {
      updates.push('current_snapshot_id = ?');
      params.push(data.currentSnapshotId);
    }
    if (data.variables !== undefined) {
      updates.push('variables = ?');
      params.push(JSON.stringify(data.variables));
    }
    if (data.checkpoint !== undefined) {
      updates.push('checkpoint = ?');
      params.push(JSON.stringify(data.checkpoint));
    }
    if (data.completedAt !== undefined) {
      updates.push('completed_at = ?');
      params.push(data.completedAt);
    }

    if (updates.length > 0) {
      params.push(instanceId);
      await this.db.run(
        `UPDATE workflow_instances SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }
  }

  /**
   * 保存检查点
   */
  async saveCheckpoint(instanceId: string, checkpoint: CheckpointRecord): Promise<void> {
    await this.updateInstance(instanceId, {
      checkpoint,
      status: 'waiting',
    });
  }

  /**
   * 清除检查点
   */
  async clearCheckpoint(instanceId: string): Promise<void> {
    await this.db.run(
      'UPDATE workflow_instances SET checkpoint = NULL, status = ? WHERE id = ?',
      ['running', instanceId]
    );
  }

  /**
   * 创建任务
   */
  private async createTask(data: {
    instanceId: string;
    nodeId: string;
    nodeName?: string;
    assigneeId?: string;
    assigneeName?: string;
    candidateUsers?: string[];
    candidateGroups?: string[];
    dueDate?: string;
    formData?: Record<string, unknown>;
  }): Promise<TaskRecord> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const task: TaskRecord = {
      id,
      instanceId: data.instanceId,
      nodeId: data.nodeId,
      nodeName: data.nodeName,
      assigneeId: data.assigneeId,
      assigneeName: data.assigneeName,
      candidateUsers: data.candidateUsers,
      candidateGroups: data.candidateGroups,
      status: 'pending',
      formData: data.formData,
      dueDate: data.dueDate,
      createdAt: now,
    };

    await this.db.run(
      `INSERT INTO workflow_tasks (
        id, instance_id, node_id, node_name,
        assignee_id, assignee_name, candidate_users, candidate_groups,
        status, form_data, due_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.instanceId,
        task.nodeId,
        task.nodeName,
        task.assigneeId,
        task.assigneeName,
        task.candidateUsers ? JSON.stringify(task.candidateUsers) : null,
        task.candidateGroups ? JSON.stringify(task.candidateGroups) : null,
        task.status,
        task.formData ? JSON.stringify(task.formData) : null,
        task.dueDate,
        task.createdAt,
      ]
    );

    return task;
  }

  /**
   * 更新任务
   */
  private async updateTask(
    taskId: string,
    data: Partial<TaskRecord>
  ): Promise<void> {
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }
    if (data.formData !== undefined) {
      updates.push('form_data = ?');
      params.push(JSON.stringify(data.formData));
    }
    if (data.comment !== undefined) {
      updates.push('comment = ?');
      params.push(data.comment);
    }
    if (data.completedAt !== undefined) {
      updates.push('completed_at = ?');
      params.push(data.completedAt);
    }
    if (data.assigneeId !== undefined) {
      updates.push('assignee_id = ?');
      params.push(data.assigneeId);
    }
    if (data.assigneeName !== undefined) {
      updates.push('assignee_name = ?');
      params.push(data.assigneeName);
    }

    if (updates.length > 0) {
      params.push(taskId);
      await this.db.run(
        `UPDATE workflow_tasks SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }
  }

  /**
   * 取消待办任务
   */
  private async cancelPendingTasks(instanceId: string): Promise<void> {
    await this.db.run(
      `UPDATE workflow_tasks SET status = 'cancelled'
       WHERE instance_id = ? AND status = 'pending'`,
      [instanceId]
    );
  }

  /**
   * 合并变量
   */
  private async mergeVariables(
    instanceId: string,
    newVariables: Record<string, unknown>
  ): Promise<void> {
    const instance = await this.getInstance(instanceId);
    if (instance) {
      const merged = { ...instance.variables, ...newVariables };
      await this.updateInstance(instanceId, { variables: merged });
    }
  }

  /**
   * 校验任务权限
   */
  private async validateTaskPermission(
    task: TaskRecord,
    operatorId: string
  ): Promise<void> {
    // 检查是否为指定审批人
    if (task.assigneeId && task.assigneeId !== operatorId) {
      // 检查是否为候选用户
      if (task.candidateUsers && !task.candidateUsers.includes(operatorId)) {
        throw new WorkflowError(
          WorkflowErrorCode.INVALID_STATE,
          '没有权限操作此任务'
        );
      }
    }
  }

  /**
   * 生成 ID
   */
  private generateId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 注册默认执行器
   */
  private registerDefaultExecutors(): void {
    // 注册各类节点执行器
    this.registerExecutor('bpmn:StartEvent', new StartEventExecutor(this));
    this.registerExecutor('bpmn:EndEvent', new EndEventExecutor(this));
    this.registerExecutor('bpmn:UserTask', new UserTaskExecutor(this));
    this.registerExecutor('bpmn:ExclusiveGateway', new GatewayExecutor(this));
    this.registerExecutor('bpmn:ParallelGateway', new GatewayExecutor(this));
    this.registerExecutor('bpmn:InclusiveGateway', new GatewayExecutor(this));
    this.registerExecutor('bpmn:TimerEvent', new TimerExecutor(this));
    this.registerExecutor('bpmn:SendTask', new ServiceTaskExecutor(this));
    this.registerExecutor('bpmn:ServiceTask', new ServiceTaskExecutor(this));
    this.registerExecutor('bpmn:ScriptTask', new ServiceTaskExecutor(this));
  }

  // ==================== 通知方法 ====================

  private async notifyWorkflowStarted(instance: InstanceRecord): Promise<void> {
    if (this.notifyService) {
      // TODO: 实现通知
    }
  }

  private async notifyWorkflowCompleted(instance: InstanceRecord): Promise<void> {
    if (this.notifyService) {
      // TODO: 实现通知
    }
  }

  private async notifyWorkflowTerminated(
    instance: InstanceRecord,
    params: TerminateParams
  ): Promise<void> {
    if (this.notifyService) {
      // TODO: 实现通知
    }
  }

  private async notifyTaskCompleted(
    task: TaskRecord,
    params: CompleteParams
  ): Promise<void> {
    if (this.notifyService) {
      // TODO: 实现通知
    }
  }

  private async notifyTaskRejected(
    task: TaskRecord,
    params: RejectParams
  ): Promise<void> {
    if (this.notifyService) {
      // TODO: 实现通知
    }
  }
}
