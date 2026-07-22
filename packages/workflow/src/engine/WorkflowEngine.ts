/**
 * 流程引擎主类
 * 负责流程实例的生命周期管理
 */

import { generateHexId } from '@low-code/shared';
import type {
  BpmnDocument,
  ProcessDefinition,
  FlowNode,
  Edge,
  ProcessInstance,
  ApprovalTask,
  WorkflowSnapshot,
} from '../schema';
import {
  isStartEvent,
  isEndEvent,
  isUserTask,
  isGateway,
  isSubProcess,
  isBoundaryEvent,
  validateBpmnDocument,
  deserializeBpmnDocument,
} from '../schema';
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
import type { JobRecord, JobStatus } from '../types/job';
import { StateMachine, type StateMachineEvent } from './StateMachine';
import { DefinitionIndex } from './DefinitionIndex';
import { SnapshotEngine } from '../snapshot/SnapshotEngine';
import { RecoveryManager } from '../recovery/RecoveryManager';
import { TimeoutManager } from './TimeoutManager';
import { RunningRegistry } from './RunningRegistry';
import { TaskStatsManager } from './TaskStatsManager';
import { StartEventExecutor } from '../executors/StartEventExecutor';
import { EndEventExecutor } from '../executors/EndEventExecutor';
import { UserTaskExecutor } from '../executors/UserTaskExecutor';
import { GatewayExecutor } from '../executors/GatewayExecutor';
import { TimerExecutor } from '../executors/TimerExecutor';
import { ServiceTaskExecutor } from '../executors/ServiceTaskExecutor';
import { ScriptTaskExecutor } from '../executors/ScriptTaskExecutor';
import { CreateRecordExecutor } from '../executors/CreateRecordExecutor';
import { UpdateRecordExecutor } from '../executors/UpdateRecordExecutor';
import { QueryRecordExecutor } from '../executors/QueryRecordExecutor';
import { DeleteRecordExecutor } from '../executors/DeleteRecordExecutor';

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
  private readonly _expressionEvaluator?: ExpressionEvaluator;
  private readonly _userResolver?: import('../types/engine').UserResolver;
  private readonly nodeExecutors = new Map<string, NodeExecutor>();
  private readonly timeoutManager: TimeoutManager;
  private readonly runningRegistry: RunningRegistry;
  private readonly taskStatsManager: TaskStatsManager;
  /** 已中止的实例 ID 集合（用于在执行过程中检查） */
  private readonly abortedInstances = new Set<string>();

  /** 流程定义索引缓存（definitionId → index），避免重复构建 */
  private readonly definitionIndexCache = new Map<string, DefinitionIndex>();

  /** 节点超时回调映射 */
  private readonly nodeTimeoutCallbacks = new Map<string, () => void>();

  /** 获取表达式求值器（供执行器使用） */
  get expressionEvaluator(): ExpressionEvaluator | undefined {
    return this._expressionEvaluator;
  }

  /** 获取用户解析器（供执行器使用） */
  get userResolver(): import('../types/engine').UserResolver | undefined {
    return this._userResolver;
  }

  constructor(config: WorkflowEngineConfig) {
    this.db = config.db;
    this.snapshotEngine = new SnapshotEngine(config.snapshotService);
    this.stateMachine = new StateMachine();
    this.recoveryManager = new RecoveryManager(config.db, this);
    this.notifyService = config.notifyService;
    this._expressionEvaluator = config.expressionEvaluator;
    this._userResolver = config.userResolver;

    // 初始化超时管理器
    this.timeoutManager = new TimeoutManager(
      (instanceId, reason) => {
        this.handleTimeout(instanceId, reason);
      },
      (instanceId, nodeId) => {
        this.handleNodeTimeout(instanceId, nodeId);
      }
    );

    // 初始化运行注册表
    this.runningRegistry = new RunningRegistry();

    // 初始化任务统计管理器
    this.taskStatsManager = new TaskStatsManager(config.db);

    // 注册默认节点执行器
    this.registerDefaultExecutors();
  }

  /**
   * 验证状态转换是否合法
   *
   * @param instance - 流程实例
   * @param event - 状态机事件
   * @throws {WorkflowError} 如果状态转换不合法
   */
  private validateStateTransition(instance: InstanceRecord, event: StateMachineEvent): void {
    if (!this.stateMachine.canTrigger(instance, event)) {
      throw new WorkflowError(
        WorkflowErrorCode.INVALID_STATE,
        `无效的状态转换: ${instance.status} -> ${event}`
      );
    }
  }

  /**
   * 执行状态转换
   *
   * @param instance - 流程实例
   * @param event - 状态机事件
   * @returns 新状态
   */
  private async transitionState(instance: InstanceRecord, event: StateMachineEvent): Promise<ProcessState> {
    return this.stateMachine.trigger(instance, event);
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

    // 2. 解析 BPMN 文档 + 构建索引
    const bpmnDoc = definition.schema;
    const process = bpmnDoc.processes[0];
    if (!process) {
      throw new WorkflowError(
        WorkflowErrorCode.DEFINITION_NOT_FOUND,
        '流程定义中没有流程'
      );
    }

    const index = new DefinitionIndex(process);
    this.definitionIndexCache.set(definition.id, index);

    // 3. 找到开始事件（使用索引）
    const startEvent = index.nodes.find(n => isStartEvent(n));
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

    // 5. 注册到运行表 + 设置超时
    this.runningRegistry.register(instance.id, (reason) => {
      this.abortedInstances.add(instance.id);
    });
    // 默认超时 30 分钟，可通过 config 覆盖
    const timeoutMs = (definition.schema.processes[0]?.extensionElements?.timeoutMs as number) || 30 * 60 * 1000;
    this.timeoutManager.scheduleExecutionTimeout(instance.id, timeoutMs);

    try {
      // 6. 捕获初始快照
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

      // 7. 注入系统变量
      const envVars = (params.variables?.$env || {}) as Record<string, unknown>;
      const systemVariables = {
        $env: {
          NODE_ENV: (globalThis as any).process?.env?.NODE_ENV || 'development',
          ...envVars,
        },
        $now: Date.now(),
        $initiator: {
          id: params.startedBy,
          name: params.startedByName || '',
        },
      };

      // 8. 执行开始事件
      const context: ExecutionContext = {
        instance,
        definition: process,
        definitionIndex: index,
        currentNode: startEvent,
        variables: {
          ...systemVariables,
          ...params.variables,
        },
        initiator: {
          id: params.startedBy,
          name: params.startedByName || '',
        },
      };

      const result = await this.executeNode(context);

      // 8. 处理执行结果
      await this.handleExecutionResult(instance, result);

      // 9. 发送通知
      await this.notifyWorkflowStarted(instance);

      return instance;
    } finally {
      // 执行完成后清理
      this.timeoutManager.clear(instance.id);
      this.runningRegistry.unregister(instance.id);
      this.abortedInstances.delete(instance.id);
    }
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
    const loaded = await this.loadDefinitionWithIndex(instance.workflowDefId);
    if (!loaded) {
      throw new WorkflowError(
        WorkflowErrorCode.DEFINITION_NOT_FOUND,
        `流程定义不存在: ${instance.workflowDefId}`
      );
    }

    const { process, index } = loaded;
    const node = index.getNode(task.nodeId);
    if (!node) {
      throw new WorkflowError(
        WorkflowErrorCode.NODE_EXECUTION_FAILED,
        `节点不存在: ${task.nodeId}`
      );
    }

    // 6. 更新任务状态
    await this.updateTask(params.taskId, {
      status: 'resolved',
      formData: params.formData,
      comment: params.comment,
      completedAt: new Date().toISOString(),
    });

    // 更新用户任务统计
    if (task.assigneeId) {
      await this.taskStatsManager.onTaskCompleted(task.assigneeId);
    }

    // 7. 更新流程变量
    if (params.formData) {
      await this.mergeVariables(instance.id, params.formData);
    }

    // 8. 检查是否为会签/或签（使用新的 resume 逻辑）
    if (isUserTask(node)) {
      const executor = this.nodeExecutors.get('bpmn:UserTask');
      if (executor && 'resume' in executor) {
        // 获取同节点的所有任务
        const allTasks = await this.db.all<TaskRecord>(
          `SELECT * FROM workflow_tasks WHERE instance_id = ? AND node_id = ?`,
          [task.instanceId, task.nodeId]
        );

        const resumeContext: ExecutionContext = {
          instance,
          definition: process,
          definitionIndex: index,
          currentNode: node,
          variables: instance.variables || {},
          initiator: { id: params.operatorId, name: params.operatorName || '' },
        };
        const resumeResult = await (executor as any).resume(resumeContext, allTasks);
        if (resumeResult.waiting) {
          // 会签/或签未完成，等待其他审批
          return instance;
        }

        if (!resumeResult.success) {
          // 验证状态转换
          this.validateStateTransition(instance, 'reject');
          // 审批被驳回
          await this.updateInstance(instance.id, { status: 'rejected' });
          return instance;
        }
      }
    }

    // 9. 捕获节点完成快照
    const latestSnapshot = await this.snapshotEngine.getLatestSnapshot(instance.id);
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

    // 10. 注入操作人变量并执行节点后续逻辑
    const operatorVariables = {
      $operator: {
        id: params.operatorId,
        name: params.operatorName || '',
      },
      $now: Date.now(),
    };

    const context: ExecutionContext = {
      instance,
      definition: process,
      definitionIndex: index,
      currentNode: node,
      variables: {
        ...operatorVariables,
        ...instance.variables,
        ...params.formData,
      },
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

    const loaded = await this.loadDefinitionWithIndex(instance.workflowDefId);
    if (!loaded) {
      throw new WorkflowError(
        WorkflowErrorCode.DEFINITION_NOT_FOUND,
        `流程定义不存在: ${instance.workflowDefId}`
      );
    }

    const { index } = loaded;
    const node = index.getNode(task.nodeId);
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

    // 更新用户任务统计
    if (task.assigneeId) {
      await this.taskStatsManager.onTaskRejected(task.assigneeId);
    }

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

    // 验证状态转换
    this.validateStateTransition(instance, 'terminate');

    // 中止正在运行的执行
    this.runningRegistry.abort(params.instanceId, params.reason);
    this.abortedInstances.add(params.instanceId);
    this.timeoutManager.clear(params.instanceId);
    this.timeoutManager.clearAllNodeTimeouts(params.instanceId);

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
   * 转办任务
   * 将任务从当前审批人转给其他人
   */
  async transfer(params: import('../types/engine').TransferParams): Promise<void> {
    // 1. 获取并校验任务
    const task = await this.getTask(params.taskId);
    if (!task) {
      throw new WorkflowError(
        WorkflowErrorCode.TASK_NOT_FOUND,
        `任务不存在: ${params.taskId}`
      );
    }
    if (task.status !== 'pending') {
      throw new WorkflowError(
        WorkflowErrorCode.INVALID_STATE,
        `任务状态不是待处理: ${task.status}`
      );
    }

    // 2. 校验操作人权限
    await this.validateTaskPermission(task, params.operatorId);

    // 3. 取消原任务
    await this.updateTask(params.taskId, {
      status: 'cancelled',
      comment: `转办给 ${params.targetUserName || params.targetUserId}，原因: ${params.reason || '无'}`,
      completedAt: new Date().toISOString(),
    });

    // 4. 创建新任务给目标人
    await this.createTask({
      instanceId: task.instanceId,
      nodeId: task.nodeId,
      nodeName: task.nodeName,
      assigneeId: params.targetUserId,
      assigneeName: params.targetUserName,
    });
  }

  /**
   * 加签
   * 在当前审批节点添加额外的审批人
   */
  async addSign(params: import('../types/engine').AddSignParams): Promise<void> {
    // 1. 获取并校验任务
    const task = await this.getTask(params.taskId);
    if (!task) {
      throw new WorkflowError(
        WorkflowErrorCode.TASK_NOT_FOUND,
        `任务不存在: ${params.taskId}`
      );
    }
    if (task.status !== 'pending') {
      throw new WorkflowError(
        WorkflowErrorCode.INVALID_STATE,
        `任务状态不是待处理: ${task.status}`
      );
    }

    // 2. 根据加签类型执行
    switch (params.type) {
      case 'parallel':
        // 并行加签：为当前节点创建额外的并行任务
        for (let i = 0; i < params.assigneeIds.length; i++) {
          await this.createTask({
            instanceId: task.instanceId,
            nodeId: task.nodeId,
            nodeName: task.nodeName,
            assigneeId: params.assigneeIds[i],
            assigneeName: params.assigneeNames?.[i],
          });
        }
        break;

      case 'before':
        // 前加签：取消当前任务，先让加签人审批，完成后再创建原任务
        await this.updateTask(params.taskId, {
          status: 'cancelled',
          comment: `前加签，原因: ${params.reason || '无'}`,
        });
        // 创建加签人的任务（附带原任务 ID 信息，便于完成后恢复）
        for (let i = 0; i < params.assigneeIds.length; i++) {
          await this.createTask({
            instanceId: task.instanceId,
            nodeId: task.nodeId,
            nodeName: task.nodeName,
            assigneeId: params.assigneeIds[i],
            assigneeName: params.assigneeNames?.[i],
          });
        }
        break;

      case 'after':
        // 后加签：当前任务完成后，再创建加签人的任务
        // 在当前节点的所有任务完成后，检查是否有后加签标记
        // 简化实现：直接创建加签任务（当前任务完成后再触发）
        for (let i = 0; i < params.assigneeIds.length; i++) {
          await this.createTask({
            instanceId: task.instanceId,
            nodeId: task.nodeId,
            nodeName: task.nodeName,
            assigneeId: params.assigneeIds[i],
            assigneeName: params.assigneeNames?.[i],
          });
        }
        break;
    }
  }

  /**
   * 认领任务（竞签模式）
   * 第一个认领的人获得任务，其他人的任务自动取消
   */
  async claimTask(taskId: string, userId: string): Promise<boolean> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new WorkflowError(
        WorkflowErrorCode.TASK_NOT_FOUND,
        `任务不存在: ${taskId}`
      );
    }
    if (task.status !== 'pending') {
      throw new WorkflowError(
        WorkflowErrorCode.INVALID_STATE,
        `任务状态不是待处理: ${task.status}`
      );
    }

    // 获取同节点的所有 pending 任务
    const allTasks = await this.db.all<TaskRecord>(
      `SELECT * FROM workflow_tasks WHERE instance_id = ? AND node_id = ? AND status = 'pending'`,
      [task.instanceId, task.nodeId]
    );

    // 获取 UserTaskExecutor 并委托认领逻辑
    const executor = this.nodeExecutors.get('bpmn:UserTask');
    if (executor && 'claim' in executor) {
      return (executor as any).claim(taskId, userId, allTasks);
    }

    return false;
  }

  /**
   * 调度节点级超时
   */
  scheduleNodeTimeout(instanceId: string, nodeId: string, duration: number, callback: () => void): void {
    const key = `${instanceId}:${nodeId}`;
    this.nodeTimeoutCallbacks.set(key, callback);
    this.timeoutManager.scheduleNodeTimeout(instanceId, nodeId, duration);
  }

  /**
   * 清除节点级超时
   */
  clearNodeTimeout(instanceId: string, nodeId: string): void {
    const key = `${instanceId}:${nodeId}`;
    this.nodeTimeoutCallbacks.delete(key);
    this.timeoutManager.clearNodeTimeout(instanceId, nodeId);
  }

  /**
   * 处理节点超时
   */
  private async handleNodeTimeout(instanceId: string, nodeId: string): Promise<void> {
    const key = `${instanceId}:${nodeId}`;
    const callback = this.nodeTimeoutCallbacks.get(key);
    if (callback) {
      this.nodeTimeoutCallbacks.delete(key);
      try {
        callback();
      } catch (error) {
        console.error(`节点超时回调执行失败: ${key}`, error);
      }
    }
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

  /**
   * 加载流程定义并构建索引（带缓存）
   * 返回 [DefinitionRecord, ProcessDefinition, DefinitionIndex] 三元组
   */
  private async loadDefinitionWithIndex(
    definitionId: string
  ): Promise<{ record: DefinitionRecord; process: ProcessDefinition; index: DefinitionIndex } | undefined> {
    const record = await this.getDefinitionById(definitionId);
    if (!record) return undefined;

    const process = record.schema.processes[0];
    if (!process) return undefined;

    let index = this.definitionIndexCache.get(definitionId);
    if (!index) {
      index = new DefinitionIndex(process);
      this.definitionIndexCache.set(definitionId, index);
    }

    return { record, process, index };
  }

  // ==================== Job 管理 ====================

  /**
   * 保存节点执行结果（Job）
   */
  async saveJob(params: {
    instanceId: string;
    nodeId: string;
    nodeKey?: string;
    upstreamId?: string;
    status: JobStatus;
    result?: unknown;
    meta?: Record<string, unknown>;
    error?: string;
  }): Promise<JobRecord> {
    const id = generateHexId();
    const now = new Date().toISOString();

    const job: JobRecord = {
      id,
      instanceId: params.instanceId,
      nodeId: params.nodeId,
      nodeKey: params.nodeKey,
      upstreamId: params.upstreamId,
      status: params.status,
      result: params.result,
      meta: params.meta,
      error: params.error,
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.run(
      `INSERT INTO workflow_jobs (
        id, instance_id, node_id, node_key, upstream_id,
        status, result, meta, error, retry_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        job.id,
        job.instanceId,
        job.nodeId,
        job.nodeKey || null,
        job.upstreamId || null,
        job.status,
        job.result ? JSON.stringify(job.result) : null,
        job.meta ? JSON.stringify(job.meta) : null,
        job.error || null,
        job.retryCount,
        job.createdAt,
        job.updatedAt,
      ]
    );

    return job;
  }

  /**
   * 获取流程实例的所有 Job
   */
  async getJobs(instanceId: string): Promise<JobRecord[]> {
    return this.db.all<JobRecord>(
      'SELECT * FROM workflow_jobs WHERE instance_id = ? ORDER BY created_at ASC',
      [instanceId]
    );
  }

  /**
   * 获取指定节点的最新 Job
   */
  async getLatestJob(instanceId: string, nodeId: string): Promise<JobRecord | undefined> {
    return this.db.get<JobRecord>(
      'SELECT * FROM workflow_jobs WHERE instance_id = ? AND node_id = ? ORDER BY created_at DESC LIMIT 1',
      [instanceId, nodeId]
    );
  }

  /**
   * 获取用户任务统计
   */
  async getUserTaskStats(userId: string) {
    return this.taskStatsManager.getStats(userId);
  }

  /**
   * 获取所有用户任务统计
   */
  async getAllUserTaskStats() {
    return this.taskStatsManager.getAllStats();
  }

  // ==================== 私有方法 ====================

  /**
   * 执行节点
   */
  private async executeNode(context: ExecutionContext): Promise<ExecutionResult> {
    const { currentNode, instance } = context;

    // 检查实例是否已被中止
    if (this.abortedInstances.has(instance.id)) {
      return {
        success: false,
        error: '流程已被中止',
      };
    }

    // 检查是否应该继续执行
    if (!this.timeoutManager.shouldContinue(instance)) {
      return {
        success: false,
        error: '流程状态异常，无法继续执行',
      };
    }

    const executor = this.nodeExecutors.get(currentNode.$type);

    if (!executor) {
      throw new WorkflowError(
        WorkflowErrorCode.NODE_EXECUTION_FAILED,
        `没有找到节点执行器: ${currentNode.$type}`
      );
    }

    // 获取重试配置
    const nodeConfig = executor.getNodeConfig(currentNode);
    const maxRetries = nodeConfig.retryCount || 0;
    const retryInterval = nodeConfig.retryInterval || 1000;

    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await executor.execute(context);

        // 保存 Job（非等待状态的节点才保存，等待状态由 complete/reject 保存）
        if (!result.waiting) {
          await this.saveJob({
            instanceId: instance.id,
            nodeId: currentNode.id,
            status: result.success ? 'resolved' : 'failed',
            result: result.variableUpdates || result.snapshot?.data,
            error: result.error,
            meta: attempt > 0 ? { retryCount: attempt } : undefined,
          });
        }

        return result;
      } catch (error) {
        lastError = error;

        // 还有重试机会，等待后重试
        if (attempt < maxRetries) {
          const delay = retryInterval * Math.pow(2, attempt); // 指数退避
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // 重试耗尽，保存失败 Job
        await this.saveJob({
          instanceId: instance.id,
          nodeId: currentNode.id,
          status: 'error',
          error: error instanceof Error ? error.message : '节点执行失败',
          meta: { retryCount: attempt, maxRetries },
        });
      }
    }

    throw new WorkflowError(
      WorkflowErrorCode.NODE_EXECUTION_FAILED,
      `节点执行失败: ${currentNode.name || currentNode.id}（重试 ${maxRetries} 次后仍失败）`,
      lastError
    );
  }

  /**
   * 执行节点后续逻辑（任务完成后）
   */
  private async executeNodePostLogic(context: ExecutionContext): Promise<ExecutionResult> {
    const { currentNode, definition, definitionIndex } = context;

    // 使用索引获取出口连线（O(1) 替代 O(n) filter）
    const outgoingEdges = definitionIndex
      ? definitionIndex.getOutgoingByNode(currentNode)
      : definition.edges.filter((e: Edge) => currentNode.outgoing?.includes(e.id));

    if (outgoingEdges.length === 0) {
      // 没有出口，可能是结束节点
      return { success: true, completed: true };
    }

    // 单出口
    if (outgoingEdges.length === 1) {
      const targetRef = (outgoingEdges[0] as { targetRef?: string }).targetRef;
      const targetNode = definitionIndex
        ? (targetRef ? definitionIndex.getNode(targetRef) : undefined)
        : definition.nodes.find((n: FlowNode) => n.id === targetRef);
      if (!targetNode) {
        throw new WorkflowError(
          WorkflowErrorCode.NODE_EXECUTION_FAILED,
          `目标节点不存在: ${targetRef}`
        );
      }

      // 继续执行下一个节点
      const nextContext: ExecutionContext = {
        ...context,
        currentNode: targetNode,
      };
      return this.executeNode(nextContext);
    }

    // 多出口（条件网关）- 使用 GatewayExecutor 统一处理
    const executor = this.nodeExecutors.get(currentNode.$type);
    if (executor) {
      return executor.execute(context);
    }

    throw new WorkflowError(
      WorkflowErrorCode.NODE_EXECUTION_FAILED,
      `没有找到节点执行器: ${currentNode.$type}`
    );
  }

  /**
   * 处理执行结果
   */
  private async handleExecutionResult(
    instance: InstanceRecord,
    result: ExecutionResult
  ): Promise<void> {
    if (!result.success) {
      // 验证状态转换
      this.validateStateTransition(instance, 'fail');
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
      // 验证状态转换
      this.validateStateTransition(instance, 'wait');
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
      // 只查询一次定义（修复：原来在循环内重复查询）
      const loaded = await this.loadDefinitionWithIndex(instance.workflowDefId);
      if (!loaded) return;

      const { process, index } = loaded;

      if (result.nextNodes.length > 1) {
        // 并行网关多分支：Promise.all 并发执行（修复：原来顺序执行）
        await Promise.all(
          result.nextNodes.map(async ({ node }) => {
            const context: ExecutionContext = {
              instance,
              definition: process,
              definitionIndex: index,
              currentNode: node,
              variables: instance.variables,
            };
            const nextResult = await this.executeNode(context);
            await this.handleExecutionResult(instance, nextResult);
          })
        );
      } else {
        // 单分支顺序执行
        const { node } = result.nextNodes[0];
        const context: ExecutionContext = {
          instance,
          definition: process,
          definitionIndex: index,
          currentNode: node,
          variables: instance.variables,
        };
        const nextResult = await this.executeNode(context);
        await this.handleExecutionResult(instance, nextResult);
      }
    }
  }

  /**
   * 处理流程完成
   */
  private async handleCompletion(instance: InstanceRecord): Promise<void> {
    // 验证状态转换
    this.validateStateTransition(instance, 'complete');

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
    const rejectAction = (node as { extensionElements?: { approvalConfig?: { rejectAction?: string } } })
      .extensionElements?.approvalConfig?.rejectAction || 'rejectToStart';

    let targetNodeId: string | undefined;

    // 一次性加载定义 + 索引（后续两个 case 都用到）
    const loaded = await this.loadDefinitionWithIndex(instance.workflowDefId);

    switch (rejectAction) {
      case 'rejectToStart': {
        // 驳回到开始事件（使用索引遍历节点找 StartEvent）
        if (loaded) {
          const startEvent = loaded.index.nodes.find(n => isStartEvent(n));
          targetNodeId = startEvent?.id;
        }
        break;
      }
      case 'rejectToPrevious': {
        // 驳回到上一个节点
        const snapshots = await this.snapshotEngine.getSnapshotChain(instance.id);
        if (snapshots.length >= 2) {
          targetNodeId = snapshots[snapshots.length - 2].nodeId;
        }
        break;
      }
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

    if (targetNodeId && loaded) {
      // 验证状态转换（从 rejected 恢复到 running）
      this.validateStateTransition(instance, 'restart');

      // 更新当前节点
      await this.updateInstance(instance.id, {
        currentNodeId: targetNodeId,
        status: 'running',
      });

      // 重新执行目标节点（使用索引 O(1) 查找）
      const { process, index } = loaded;
      const targetNode = index.getNode(targetNodeId);
      if (targetNode) {
        const context: ExecutionContext = {
          instance,
          definition: process,
          definitionIndex: index,
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

  /**
   * 创建流程实例
   */
  private async createInstance(data: Partial<InstanceRecord>): Promise<InstanceRecord> {
    const id = generateHexId();
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
    dueDate?: string;
    formData?: Record<string, unknown>;
  }): Promise<TaskRecord> {
    const id = generateHexId();
    const now = new Date().toISOString();

    const task: TaskRecord = {
      id,
      instanceId: data.instanceId,
      nodeId: data.nodeId,
      nodeName: data.nodeName,
      assigneeId: data.assigneeId,
      assigneeName: data.assigneeName,
      status: 'pending',
      formData: data.formData,
      dueDate: data.dueDate,
      createdAt: now,
    };

    await this.db.run(
      `INSERT INTO workflow_tasks (
        id, instance_id, node_id, node_name,
        assignee_id, assignee_name,
        status, form_data, due_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.instanceId,
        task.nodeId,
        task.nodeName,
        task.assigneeId,
        task.assigneeName,
        task.status,
        task.formData ? JSON.stringify(task.formData) : null,
        task.dueDate,
        task.createdAt,
      ]
    );

    // 更新用户任务统计
    if (task.assigneeId) {
      await this.taskStatsManager.onTaskCreated(task.assigneeId);
    }

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
      throw new WorkflowError(
        WorkflowErrorCode.INVALID_STATE,
        '没有权限操作此任务'
      );
    }
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
    this.registerExecutor('bpmn:ScriptTask', new ScriptTaskExecutor(this));

    // 注册数据操作执行器
    this.registerExecutor('bpmn:CreateTask', new CreateRecordExecutor(this));
    this.registerExecutor('bpmn:UpdateTask', new UpdateRecordExecutor(this));
    this.registerExecutor('bpmn:QueryTask', new QueryRecordExecutor(this));
    this.registerExecutor('bpmn:DeleteTask', new DeleteRecordExecutor(this));
  }

  // ==================== 超时处理 ====================

  /**
   * 处理执行超时
   */
  private async handleTimeout(instanceId: string, reason: string): Promise<void> {
    try {
      const instance = await this.getInstance(instanceId);
      if (!instance || (instance.status !== 'running' && instance.status !== 'waiting')) {
        return;
      }

      // 标记为中止
      this.abortedInstances.add(instanceId);
      this.runningRegistry.abort(instanceId, reason);

      // 更新实例状态
      await this.updateInstance(instanceId, {
        status: 'terminated',
        completedAt: new Date().toISOString(),
      });

      // 取消待办任务
      await this.cancelPendingTasks(instanceId);

      // 捕获超时快照
      if (instance.sourceTable && instance.sourceId) {
        await this.snapshotEngine.capture({
          instanceId,
          sourceTable: instance.sourceTable,
          sourceId: instance.sourceId,
          data: instance.variables,
          snapshotType: 'TERMINATED',
          comment: `执行超时: ${reason}`,
        });
      }

      // 通知
      await this.notifyWorkflowTerminated(instance, {
        instanceId,
        operatorId: 'system',
        reason: `执行超时: ${reason}`,
      });
    } catch (error) {
      // 超时处理失败不应抛出异常
      console.error(`处理流程超时失败: ${instanceId}`, error);
    }
  }

  // ==================== 通知方法 ====================

  private async notifyWorkflowStarted(instance: InstanceRecord): Promise<void> {
    if (!this.notifyService) return;

    try {
      await this.notifyService.send({
        receiverIds: [instance.startedBy || ''],
        type: 'custom',
        title: `流程已启动: ${instance.workflowName || instance.workflowDefId}`,
        content: `流程实例 ${instance.id} 已启动`,
        data: {
          instanceId: instance.id,
          workflowDefId: instance.workflowDefId,
          startedAt: instance.startedAt,
        },
      });
    } catch (error) {
      console.error('发送流程启动通知失败:', error);
    }
  }

  private async notifyWorkflowCompleted(instance: InstanceRecord): Promise<void> {
    if (!this.notifyService) return;

    try {
      await this.notifyService.send({
        receiverIds: [instance.startedBy || ''],
        type: 'complete',
        title: `流程已完成: ${instance.workflowName || instance.workflowDefId}`,
        content: `流程实例 ${instance.id} 已完成`,
        data: {
          instanceId: instance.id,
          workflowDefId: instance.workflowDefId,
          completedAt: instance.completedAt,
        },
      });
    } catch (error) {
      console.error('发送流程完成通知失败:', error);
    }
  }

  private async notifyWorkflowTerminated(
    instance: InstanceRecord,
    params: TerminateParams
  ): Promise<void> {
    if (!this.notifyService) return;

    try {
      await this.notifyService.send({
        receiverIds: [instance.startedBy || ''],
        type: 'custom',
        title: `流程已终止: ${instance.workflowName || instance.workflowDefId}`,
        content: `流程实例 ${instance.id} 已终止，原因: ${params.reason || '无'}`,
        data: {
          instanceId: instance.id,
          workflowDefId: instance.workflowDefId,
          reason: params.reason,
          terminatedBy: params.operatorId,
        },
      });
    } catch (error) {
      console.error('发送流程终止通知失败:', error);
    }
  }

  private async notifyTaskCompleted(
    task: TaskRecord,
    params: CompleteParams
  ): Promise<void> {
    if (!this.notifyService) return;

    try {
      // 通知流程发起人
      const instance = await this.getInstance(task.instanceId);
      if (instance) {
        await this.notifyService.send({
          receiverIds: [instance.startedBy || ''],
          type: 'complete',
          title: `审批已通过: ${task.nodeName}`,
          content: `任务 ${task.nodeName} 已由 ${params.operatorName || params.operatorId} 审批通过`,
          data: {
            taskId: task.id,
            instanceId: task.instanceId,
            nodeId: task.nodeId,
            nodeName: task.nodeName,
            comment: params.comment,
          },
        });
      }
    } catch (error) {
      console.error('发送任务完成通知失败:', error);
    }
  }

  private async notifyTaskRejected(
    task: TaskRecord,
    params: RejectParams
  ): Promise<void> {
    if (!this.notifyService) return;

    try {
      // 通知流程发起人
      const instance = await this.getInstance(task.instanceId);
      if (instance) {
        await this.notifyService.send({
          receiverIds: [instance.startedBy || ''],
          type: 'reject',
          title: `审批已驳回: ${task.nodeName}`,
          content: `任务 ${task.nodeName} 已被 ${params.operatorName || params.operatorId} 驳回，原因: ${params.comment || '无'}`,
          data: {
            taskId: task.id,
            instanceId: task.instanceId,
            nodeId: task.nodeId,
            nodeName: task.nodeName,
            comment: params.comment,
          },
        });
      }
    } catch (error) {
      console.error('发送任务驳回通知失败:', error);
    }
  }
}
