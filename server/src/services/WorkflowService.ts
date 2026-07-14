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
  JobRecord,
  UserResolver,
  ResolvedUser,
} from '@low-code/workflow';
import { FileDatabaseAdapter } from './FileDatabaseAdapter.js';
import { FileSnapshotService } from './FileSnapshotService.js';
import { TENANTS_DIR } from '../config/index.js';
import { getDbManager } from '../config/db.js';
import path from 'path';

/**
 * 租户用户解析器
 *
 * 运行时将指派策略（角色/部门/岗位）解析为具体用户列表。
 * 通过 DatabaseManager 获取租户 SQLite 数据库查询用户信息。
 */
class TenantUserResolver implements UserResolver {
  constructor(private tenantDirName: string) {}

  private getDb() {
    return getDbManager().getTenantDb(this.tenantDirName);
  }

  async findByRoles(roleIds: string[]): Promise<ResolvedUser[]> {
    if (roleIds.length === 0) return [];

    const db = this.getDb();
    const placeholders = roleIds.map(() => '?').join(',');
    const rows = db.prepare(`
      SELECT DISTINCT u.user_id AS id, u.name
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.user_id
      WHERE ur.role_id IN (${placeholders}) AND u.status = 'active'
    `).all(...roleIds) as ResolvedUser[];

    return rows;
  }

  async findByDepartments(deptIds: string[]): Promise<ResolvedUser[]> {
    if (deptIds.length === 0) return [];

    const db = this.getDb();
    const placeholders = deptIds.map(() => '?').join(',');
    const rows = db.prepare(`
      SELECT DISTINCT u.user_id AS id, u.name
      FROM users u
      JOIN user_departments ud ON ud.user_id = u.user_id
      WHERE ud.dept_id IN (${placeholders}) AND u.status = 'active'
    `).all(...deptIds) as ResolvedUser[];

    return rows;
  }

  async findByPositions(positionIds: string[]): Promise<ResolvedUser[]> {
    if (positionIds.length === 0) return [];

    const db = this.getDb();
    const placeholders = positionIds.map(() => '?').join(',');
    const rows = db.prepare(`
      SELECT DISTINCT u.user_id AS id, u.name
      FROM users u
      JOIN user_departments ud ON ud.user_id = u.user_id
      WHERE ud.position_id IN (${placeholders}) AND u.status = 'active'
    `).all(...positionIds) as ResolvedUser[];

    return rows;
  }

  async findByIds(userIds: string[]): Promise<ResolvedUser[]> {
    if (userIds.length === 0) return [];

    const db = this.getDb();
    const placeholders = userIds.map(() => '?').join(',');
    const rows = db.prepare(`
      SELECT user_id AS id, name
      FROM users
      WHERE user_id IN (${placeholders}) AND status = 'active'
    `).all(...userIds) as ResolvedUser[];

    return rows;
  }
}

/**
 * 流程服务单例
 */
export class WorkflowService {
  private static instances = new Map<string, WorkflowEngine>();

  /**
   * 获取或创建 WorkflowEngine 实例
   */
  static async getEngine(tenantId: string, appId: string): Promise<WorkflowEngine> {
    const key = `${tenantId}:${appId}`;

    if (!this.instances.has(key)) {
      const baseDir = path.join(TENANTS_DIR, tenantId, 'apps', `app_${appId}`);
      const db = new FileDatabaseAdapter(baseDir);
      const snapshotService = new FileSnapshotService(baseDir);

      await db.init();
      await snapshotService.init();

      // 创建用户解析器 — 运行时将指派策略（角色/部门/岗位）解析为具体用户
      const dirName = tenantId.startsWith('tenant_') ? tenantId : `tenant_${tenantId}`;
      const userResolver = new TenantUserResolver(dirName);

      const engine = new WorkflowEngine({
        db,
        snapshotService,
        userResolver,
      });

      this.instances.set(key, engine);
    }

    return this.instances.get(key)!;
  }

  /**
   * 启动流程实例
   */
  static async start(tenantId: string, appId: string, params: StartParams): Promise<InstanceRecord> {
    const engine = await this.getEngine(tenantId, appId);

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
    const engine = await this.getEngine(tenantId, appId);

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
    const engine = await this.getEngine(tenantId, appId);

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
    const engine = await this.getEngine(tenantId, appId);

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
    const engine = await this.getEngine(tenantId, appId);

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
    const engine = await this.getEngine(tenantId, appId);

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
    const engine = await this.getEngine(tenantId, appId);

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
    const engine = await this.getEngine(tenantId, appId);

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
    const engine = await this.getEngine(tenantId, appId);
    return engine.getInstance(instanceId);
  }

  /**
   * 获取任务
   */
  static async getTask(tenantId: string, appId: string, taskId: string): Promise<TaskRecord | undefined> {
    const engine = await this.getEngine(tenantId, appId);
    return engine.getTask(taskId);
  }

  /**
   * 获取待办任务
   */
  static async getPendingTasks(tenantId: string, appId: string, assigneeId: string): Promise<TaskRecord[]> {
    const engine = await this.getEngine(tenantId, appId);
    return engine.getPendingTasks(assigneeId);
  }

  /**
   * 获取流程定义
   */
  static async getDefinition(tenantId: string, appId: string, workflowKey: string, version?: number): Promise<DefinitionRecord | undefined> {
    const engine = await this.getEngine(tenantId, appId);
    return engine.getDefinition(workflowKey, version);
  }

  /**
   * 获取流程实例的所有 Job
   */
  static async getJobs(tenantId: string, appId: string, instanceId: string): Promise<JobRecord[]> {
    const engine = await this.getEngine(tenantId, appId);
    return engine.getJobs(instanceId);
  }

  /**
   * 获取指定节点的最新 Job
   */
  static async getLatestJob(tenantId: string, appId: string, instanceId: string, nodeId: string): Promise<JobRecord | undefined> {
    const engine = await this.getEngine(tenantId, appId);
    return engine.getLatestJob(instanceId, nodeId);
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
