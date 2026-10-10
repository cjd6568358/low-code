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
import { TenantDataSourceResolver } from './WorkflowDataSource.js';
import { TENANTS_DIR } from '../config/index.js';
import { getDbManager } from '../config/db.js';
import path from 'path';

/**
 * 将 SQLite 查询结果行收窄为用户解析结果
 *
 * 查询语句显式选取 `user_id AS id, name`，行结构由 SQL 保证；
 * 这里做一次类型收窄，避免对查询结果做不安全断言。
 *
 * @param rows 查询结果行
 * @returns 用户解析结果列表
 */
function rowsToResolvedUsers(rows: Array<Record<string, unknown>>): ResolvedUser[] {
  const users: ResolvedUser[] = [];
  for (const row of rows) {
    const id = row.id;
    const name = row.name;
    if (typeof id === 'string' && typeof name === 'string') {
      users.push({ id, name });
    }
  }
  return users;
}

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
    `).all(...roleIds);

    return rowsToResolvedUsers(rows);
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
    `).all(...deptIds);

    return rowsToResolvedUsers(rows);
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
    `).all(...positionIds);

    return rowsToResolvedUsers(rows);
  }

  async findByIds(userIds: string[]): Promise<ResolvedUser[]> {
    if (userIds.length === 0) return [];

    const db = this.getDb();
    const placeholders = userIds.map(() => '?').join(',');
    const rows = db.prepare(`
      SELECT user_id AS id, name
      FROM users
      WHERE user_id IN (${placeholders}) AND status = 'active'
    `).all(...userIds);

    return rowsToResolvedUsers(rows);
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

      // 创建业务数据源解析器 — 数据操作节点通过它访问租户动态表
      const dataSourceResolver = new TenantDataSourceResolver(
        getDbManager().getTenantDb(dirName),
        dirName,
      );

      const engine = new WorkflowEngine({
        db,
        snapshotService,
        userResolver,
        dataSourceResolver,
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
   *
   * 委托给引擎的 transfer()：取消原任务并为目标人创建新任务。
   */
  static async transfer(tenantId: string, appId: string, params: TransferParams): Promise<TaskRecord> {
    const engine = await this.getEngine(tenantId, appId);
    return await engine.transfer(params);
  }

  /**
   * 加签
   *
   * 委托给引擎的 addSign()，支持 before/after/parallel 三种加签类型。
   */
  static async addSign(tenantId: string, appId: string, params: AddSignParams): Promise<TaskRecord[]> {
    const engine = await this.getEngine(tenantId, appId);
    return await engine.addSign(params);
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
