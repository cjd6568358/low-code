/**
 * 流程服务
 *
 * 封装 WorkflowEngine，提供统一的业务接口。
 */

import { WorkflowEngine, WorkflowError, WorkflowErrorCode } from '@low-code/workflow';
import type {
  StartParams,
  CompleteParams,
  RejectParams,
  TerminateParams,
  TransferParams,
  AddSignParams,
  InstanceRecord,
  TaskRecord,
  DefinitionRecord,
} from '@low-code/workflow';
import { FileDatabaseAdapter } from './FileDatabaseAdapter.js';
import { FileSnapshotService } from './FileSnapshotService.js';
import { TENANTS_DIR } from '../config/index.js';
import fs from 'fs';
import path from 'path';

/**
 * 流程服务单例
 */
export class WorkflowService {
  private static instances = new Map<string, WorkflowEngine>();

  /**
   * 获取或创建 WorkflowEngine 实例
   */
  static getEngine(tenantId: string, appId: string): WorkflowEngine {
    const key = `${tenantId}:${appId}`;

    if (!this.instances.has(key)) {
      const baseDir = path.join(TENANTS_DIR, tenantId, 'apps', `app_${appId}`);
      const db = new FileDatabaseAdapter(baseDir);
      const snapshotService = new FileSnapshotService(baseDir);

      const engine = new WorkflowEngine({
        db,
        snapshotService,
      });

      this.instances.set(key, engine);
    }

    return this.instances.get(key)!;
  }

  /**
   * 启动流程实例
   */
  static async start(tenantId: string, appId: string, params: StartParams): Promise<InstanceRecord> {
    const engine = this.getEngine(tenantId, appId);

    try {
      return await engine.start(params);
    } catch (error) {
      if (error instanceof WorkflowError) {
        throw error;
      }
      throw new WorkflowError(
        WorkflowErrorCode.NODE_EXECUTION_FAILED,
        '启动流程失败',
        error
      );
    }
  }

  /**
   * 完成任务（审批通过）
   */
  static async complete(tenantId: string, appId: string, params: CompleteParams): Promise<InstanceRecord> {
    const engine = this.getEngine(tenantId, appId);

    try {
      return await engine.complete(params);
    } catch (error) {
      if (error instanceof WorkflowError) {
        throw error;
      }
      throw new WorkflowError(
        WorkflowErrorCode.NODE_EXECUTION_FAILED,
        '完成任务失败',
        error
      );
    }
  }

  /**
   * 驳回任务
   */
  static async reject(tenantId: string, appId: string, params: RejectParams): Promise<InstanceRecord> {
    const engine = this.getEngine(tenantId, appId);

    try {
      return await engine.reject(params);
    } catch (error) {
      if (error instanceof WorkflowError) {
        throw error;
      }
      throw new WorkflowError(
        WorkflowErrorCode.NODE_EXECUTION_FAILED,
        '驳回任务失败',
        error
      );
    }
  }

  /**
   * 终止流程
   */
  static async terminate(tenantId: string, appId: string, params: TerminateParams): Promise<InstanceRecord> {
    const engine = this.getEngine(tenantId, appId);

    try {
      return await engine.terminate(params);
    } catch (error) {
      if (error instanceof WorkflowError) {
        throw error;
      }
      throw new WorkflowError(
        WorkflowErrorCode.NODE_EXECUTION_FAILED,
        '终止流程失败',
        error
      );
    }
  }

  /**
   * 转办任务
   */
  static async transfer(tenantId: string, appId: string, params: TransferParams): Promise<TaskRecord> {
    const engine = this.getEngine(tenantId, appId);

    // 获取任务
    const task = await engine.getTask(params.taskId);
    if (!task) {
      throw new WorkflowError('TASK_NOT_FOUND', `任务不存在: ${params.taskId}`);
    }

    // 更新任务的审批人
    const db = (engine as any).db;
    await db.run(
      'UPDATE workflow_tasks SET assignee_id = ?, assignee_name = ? WHERE id = ?',
      [params.targetUserId, params.targetUserName || '', params.taskId]
    );

    // 返回更新后的任务
    return {
      ...task,
      assigneeId: params.targetUserId,
      assigneeName: params.targetUserName,
    };
  }

  /**
   * 加签
   */
  static async addSign(tenantId: string, appId: string, params: AddSignParams): Promise<TaskRecord[]> {
    const engine = this.getEngine(tenantId, appId);

    // 获取原任务
    const task = await engine.getTask(params.taskId);
    if (!task) {
      throw new WorkflowError('TASK_NOT_FOUND', `任务不存在: ${params.taskId}`);
    }

    // 为每个加签人创建新任务
    const newTasks: TaskRecord[] = [];
    const db = (engine as any).db;

    for (let i = 0; i < params.assigneeIds.length; i++) {
      const assigneeId = params.assigneeIds[i];
      const assigneeName = params.assigneeNames?.[i] || '';

      const newTask = {
        id: `task_${Date.now()}_${i}`,
        instanceId: task.instanceId,
        nodeId: task.nodeId,
        nodeName: task.nodeName,
        assigneeId,
        assigneeName,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await db.run(
        'INSERT INTO workflow_tasks (id, instance_id, node_id, node_name, assignee_id, assignee_name, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [newTask.id, newTask.instanceId, newTask.nodeId, newTask.nodeName, newTask.assigneeId, newTask.assigneeName, newTask.status, newTask.createdAt]
      );

      newTasks.push(newTask as TaskRecord);
    }

    return newTasks;
  }

  /**
   * 恢复中断的流程
   */
  static async recover(tenantId: string, appId: string, instanceId: string): Promise<InstanceRecord> {
    const engine = this.getEngine(tenantId, appId);

    try {
      return await engine.recover(instanceId);
    } catch (error) {
      if (error instanceof WorkflowError) {
        throw error;
      }
      throw new WorkflowError(
        WorkflowErrorCode.RECOVERY_FAILED,
        '恢复流程失败',
        error
      );
    }
  }

  /**
   * 批量恢复中断的流程
   */
  static async recoverAll(tenantId: string, appId: string): Promise<number> {
    const engine = this.getEngine(tenantId, appId);

    try {
      return await engine.recoverAll();
    } catch (error) {
      throw new WorkflowError(
        WorkflowErrorCode.RECOVERY_FAILED,
        '批量恢复失败',
        error
      );
    }
  }

  /**
   * 获取流程实例
   */
  static async getInstance(tenantId: string, appId: string, instanceId: string): Promise<InstanceRecord | undefined> {
    const engine = this.getEngine(tenantId, appId);
    return engine.getInstance(instanceId);
  }

  /**
   * 获取任务
   */
  static async getTask(tenantId: string, appId: string, taskId: string): Promise<TaskRecord | undefined> {
    const engine = this.getEngine(tenantId, appId);
    return engine.getTask(taskId);
  }

  /**
   * 获取待办任务
   */
  static async getPendingTasks(tenantId: string, appId: string, assigneeId: string): Promise<TaskRecord[]> {
    const engine = this.getEngine(tenantId, appId);
    return engine.getPendingTasks(assigneeId);
  }

  /**
   * 获取流程定义
   */
  static async getDefinition(tenantId: string, appId: string, workflowKey: string, version?: number): Promise<DefinitionRecord | undefined> {
    const engine = this.getEngine(tenantId, appId);
    return engine.getDefinition(workflowKey, version);
  }

  /**
   * 清除缓存（用于流程定义更新后）
   */
  static clearCache(tenantId?: string, appId?: string): void {
    if (tenantId && appId) {
      const key = `${tenantId}:${appId}`;
      this.instances.delete(key);
    } else {
      this.instances.clear();
    }
  }
}
