/**
 * 恢复管理器
 * 负责异常中断流程的恢复
 */

import type { DatabaseAdapter, InstanceRecord, CheckpointRecord } from '../types/engine';
import type { WorkflowEngine } from '../engine/WorkflowEngine';
import type { ExecutionContext } from '../types/execution';

/** 恢复状态 */
export type RecoveryStatus = 'pending' | 'recovering' | 'success' | 'failed';

/** 恢复记录 */
export interface RecoveryRecord {
  id: string;
  instanceId: string;
  status: RecoveryStatus;
  checkpoint: CheckpointRecord;
  error?: string;
  recoveredAt?: string;
  createdAt: string;
}

/** 恢复策略 */
export type RecoveryStrategy =
  | 'retry'        // 重试当前节点
  | 'skip'         // 跳过当前节点
  | 'rollback'     // 回滚到上一个检查点
  | 'manual';      // 人工干预

/** 恢复配置 */
export interface RecoveryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试间隔（毫秒） */
  retryInterval: number;
  /** 默认策略 */
  defaultStrategy: RecoveryStrategy;
  /** 超时时间（毫秒） */
  timeout: number;
}

const DEFAULT_CONFIG: RecoveryConfig = {
  maxRetries: 3,
  retryInterval: 5000,
  defaultStrategy: 'retry',
  timeout: 300000, // 5 分钟
};

/**
 * 恢复管理器
 */
export class RecoveryManager {
  private readonly config: RecoveryConfig;
  private readonly recoveryMap = new Map<string, RecoveryRecord>();

  constructor(
    private readonly db: DatabaseAdapter,
    private readonly engine: WorkflowEngine,
    config?: Partial<RecoveryConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 恢复单个流程实例
   */
  async recover(instanceId: string): Promise<InstanceRecord> {
    // 1. 获取流程实例
    const instance = await this.engine.getInstance(instanceId);
    if (!instance) {
      throw new Error(`流程实例不存在: ${instanceId}`);
    }

    // 2. 检查是否需要恢复
    if (instance.status !== 'failed' && instance.status !== 'waiting') {
      throw new Error(`流程实例状态不需要恢复: ${instance.status}`);
    }

    // 3. 获取检查点
    const checkpoint = instance.checkpoint as CheckpointRecord | undefined;
    if (!checkpoint) {
      throw new Error(`流程实例没有检查点: ${instanceId}`);
    }

    // 4. 创建恢复记录
    const recoveryRecord = this.createRecoveryRecord(instanceId, checkpoint);
    this.recoveryMap.set(instanceId, recoveryRecord);

    try {
      // 5. 更新恢复状态
      recoveryRecord.status = 'recovering';
      await this.saveRecoveryRecord(recoveryRecord);

      // 6. 执行恢复
      await this.executeRecovery(instance, checkpoint);

      // 7. 更新恢复状态
      recoveryRecord.status = 'success';
      recoveryRecord.recoveredAt = new Date().toISOString();
      await this.saveRecoveryRecord(recoveryRecord);

      // 8. 返回更新后的实例
      const recoveredInstance = await this.engine.getInstance(instanceId);
      return recoveredInstance!;
    } catch (error) {
      // 9. 恢复失败
      recoveryRecord.status = 'failed';
      recoveryRecord.error = error instanceof Error ? error.message : '恢复失败';
      await this.saveRecoveryRecord(recoveryRecord);

      throw error;
    } finally {
      this.recoveryMap.delete(instanceId);
    }
  }

  /**
   * 批量恢复所有中断的流程
   */
  async recoverAll(): Promise<number> {
    // 查找所有需要恢复的实例
    const instances = await this.db.all<InstanceRecord>(
      `SELECT * FROM workflow_instances
       WHERE status IN ('failed', 'waiting')
       AND checkpoint IS NOT NULL
       ORDER BY started_at ASC`
    );

    let recoveredCount = 0;

    for (const instance of instances) {
      try {
        await this.recover(instance.id);
        recoveredCount++;
      } catch (error) {
        // 单个实例恢复失败不影响其他实例
        console.error(`恢复流程实例失败: ${instance.id}`, error);
      }
    }

    return recoveredCount;
  }

  /**
   * 保存检查点
   */
  async saveCheckpoint(
    instanceId: string,
    checkpoint: CheckpointRecord
  ): Promise<void> {
    await this.db.run(
      `UPDATE workflow_instances
       SET checkpoint = ?
       WHERE id = ?`,
      [JSON.stringify(checkpoint), instanceId]
    );
  }

  /**
   * 清除检查点
   */
  async clearCheckpoint(instanceId: string): Promise<void> {
    await this.db.run(
      `UPDATE workflow_instances
       SET checkpoint = NULL
       WHERE id = ?`,
      [instanceId]
    );
  }

  /**
   * 获取恢复记录
   */
  getRecoveryRecord(instanceId: string): RecoveryRecord | undefined {
    return this.recoveryMap.get(instanceId);
  }

  /**
   * 检查是否正在恢复
   */
  isRecovering(instanceId: string): boolean {
    const record = this.recoveryMap.get(instanceId);
    return record?.status === 'recovering';
  }

  // ==================== 私有方法 ====================

  /**
   * 执行恢复
   */
  private async executeRecovery(
    instance: InstanceRecord,
    checkpoint: CheckpointRecord
  ): Promise<void> {
    const { nodeId, status, context } = checkpoint;

    switch (status) {
      case 'executing':
        // 节点执行中断，重新执行当前节点
        await this.recoverFromExecuting(instance, checkpoint);
        break;

      case 'waiting':
        // 等待状态，恢复等待（如定时器重新注册）
        await this.recoverFromWaiting(instance, checkpoint);
        break;

      case 'completed':
        // 节点已完成，继续执行下一个节点
        await this.recoverFromCompleted(instance, checkpoint);
        break;

      default:
        throw new Error(`未知的检查点状态: ${status}`);
    }
  }

  /**
   * 从执行状态恢复
   */
  private async recoverFromExecuting(
    instance: InstanceRecord,
    checkpoint: CheckpointRecord
  ): Promise<void> {
    const definition = await this.engine.getDefinitionById(instance.workflowDefId);
    if (!definition) {
      throw new Error(`流程定义不存在: ${instance.workflowDefId}`);
    }

    const process = definition.schema.processes[0];
    const node = process.nodes.find(n => n.id === checkpoint.nodeId);
    if (!node) {
      throw new Error(`节点不存在: ${checkpoint.nodeId}`);
    }

    // 构建执行上下文
    const context: ExecutionContext = {
      instance,
      definition: process,
      currentNode: node,
      variables: instance.variables,
    };

    // 重新执行节点（通过 complete 或直接执行）
    // 这里简化处理，实际应该根据节点类型选择恢复策略
    const result = await this.engine.complete({
      taskId: checkpoint.context.taskId as string,
      operatorId: 'system',
      operatorName: '系统恢复',
      comment: '系统自动恢复',
    });
  }

  /**
   * 从等待状态恢复
   */
  private async recoverFromWaiting(
    instance: InstanceRecord,
    checkpoint: CheckpointRecord
  ): Promise<void> {
    // 检查等待条件是否已满足
    // 例如：定时器是否已过期、外部事件是否已发生

    // 简化处理：直接恢复为运行状态
    await this.db.run(
      `UPDATE workflow_instances
       SET status = 'running'
       WHERE id = ?`,
      [instance.id]
    );

    // 清除检查点
    await this.clearCheckpoint(instance.id);
  }

  /**
   * 从完成状态恢复
   */
  private async recoverFromCompleted(
    instance: InstanceRecord,
    checkpoint: CheckpointRecord
  ): Promise<void> {
    // 节点已完成，继续执行下一个节点
    // 这需要根据流程定义找到下一个节点并执行

    const definition = await this.engine.getDefinitionById(instance.workflowDefId);
    if (!definition) {
      throw new Error(`流程定义不存在: ${instance.workflowDefId}`);
    }

    const process = definition.schema.processes[0];
    const node = process.nodes.find(n => n.id === checkpoint.nodeId);
    if (!node) {
      throw new Error(`节点不存在: ${checkpoint.nodeId}`);
    }

    // 找到出口连线
    const outgoingEdges = process.edges.filter(e =>
      node.outgoing?.includes(e.id)
    );

    if (outgoingEdges.length > 0) {
      // 继续执行下一个节点
      // 这里简化处理，实际应该根据节点类型选择恢复策略
      await this.db.run(
        `UPDATE workflow_instances
         SET status = 'running'
         WHERE id = ?`,
        [instance.id]
      );
    }

    // 清除检查点
    await this.clearCheckpoint(instance.id);
  }

  /**
   * 创建恢复记录
   */
  private createRecoveryRecord(
    instanceId: string,
    checkpoint: CheckpointRecord
  ): RecoveryRecord {
    return {
      id: this.generateId(),
      instanceId,
      status: 'pending',
      checkpoint,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * 保存恢复记录
   */
  private async saveRecoveryRecord(record: RecoveryRecord): Promise<void> {
    // 这里可以将恢复记录保存到数据库
    // 目前只保存在内存中
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
}
