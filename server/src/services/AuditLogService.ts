/**
 * 审计日志服务
 *
 * 使用 JSON 文件存储审计日志。
 * 存储结构：tenants/{tenantId}/log/audit/{id}.json
 */

import path from 'path';
import { existsAsync, readFile, writeFile, readdir, mkdir, unlink } from '../utils/fs-utils.js';

/** 审计日志条目 */
export interface AuditLogEntry {
  /** 日志 ID */
  id: string;
  /** 应用 ID */
  appId?: string;
  /** 操作人 ID */
  actorId: string;
  /** 操作人名称 */
  actorName: string;
  /** 操作人 IP */
  actorIp?: string;
  /** 操作人 User-Agent */
  actorUa?: string;
  /** 操作动作（如 "POST /api/apps"） */
  action: string;
  /** 资源类型（如 "app", "page", "automation"） */
  resourceType: string;
  /** 资源 ID */
  resourceId?: string;
  /** 资源名称 */
  resourceName?: string;
  /** 操作详情 */
  detail?: string;
  /** 操作结果 */
  result: 'success' | 'failure';
  /** 错误信息 */
  errorMsg?: string;
  /** 请求 ID */
  requestId?: string;
  /** 耗时（毫秒） */
  durationMs?: number;
  /** 创建时间 */
  createdAt: string;
}

/** 审计日志查询过滤条件 */
export interface AuditLogFilters {
  /** 按操作动作过滤 */
  action?: string;
  /** 按资源类型过滤 */
  resourceType?: string;
  /** 按操作人过滤 */
  actorId?: string;
  /** 按结果过滤 */
  result?: 'success' | 'failure';
  /** 按应用 ID 过滤 */
  appId?: string;
  /** 开始时间 */
  startTime?: string;
  /** 结束时间 */
  endTime?: string;
}

/** 审计日志查询结果 */
export interface AuditLogQueryResult {
  logs: AuditLogEntry[];
  total: number;
}

/**
 * 审计日志服务类
 *
 * 所有审计日志统一存储在 tenants/{tenantId}/log/audit/ 目录。
 */
export class AuditLogService {
  constructor(private readonly tenantsDir: string) {}

  /**
   * 获取日志目录路径
   */
  private getLogDir(tenantId: string): string {
    return path.join(this.tenantsDir, tenantId, 'log', 'audit');
  }

  /**
   * 确保日志目录存在
   */
  private async ensureLogDir(tenantId: string): Promise<string> {
    const dir = this.getLogDir(tenantId);
    if (!await existsAsync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * 保存审计日志
   */
  async save(tenantId: string, entry: AuditLogEntry): Promise<void> {
    const dir = await this.ensureLogDir(tenantId);
    const filePath = path.join(dir, `${entry.id}.json`);

    await writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
  }

  /**
   * 查询审计日志（分页）
   */
  async query(
    tenantId: string,
    filters: AuditLogFilters = {},
    limit: number = 20,
    offset: number = 0,
  ): Promise<AuditLogQueryResult> {
    const dir = this.getLogDir(tenantId);

    if (!await existsAsync(dir)) {
      return { logs: [], total: 0 };
    }

    const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
    let allLogs: AuditLogEntry[] = [];

    for (const file of files) {
      try {
        const content = JSON.parse(await readFile(path.join(dir, file), 'utf-8')) as AuditLogEntry;
        allLogs.push(content);
      } catch {
        // 跳过损坏的文件
      }
    }

    // 应用过滤条件
    if (filters.action) {
      allLogs = allLogs.filter((l) => l.action.includes(filters.action!));
    }
    if (filters.resourceType) {
      allLogs = allLogs.filter((l) => l.resourceType === filters.resourceType);
    }
    if (filters.actorId) {
      allLogs = allLogs.filter((l) => l.actorId === filters.actorId);
    }
    if (filters.result) {
      allLogs = allLogs.filter((l) => l.result === filters.result);
    }
    if (filters.appId) {
      allLogs = allLogs.filter((l) => l.appId === filters.appId);
    }
    if (filters.startTime) {
      const start = new Date(filters.startTime).getTime();
      allLogs = allLogs.filter((l) => new Date(l.createdAt).getTime() >= start);
    }
    if (filters.endTime) {
      const end = new Date(filters.endTime).getTime();
      allLogs = allLogs.filter((l) => new Date(l.createdAt).getTime() <= end);
    }

    // 按创建时间倒序
    allLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      logs: allLogs.slice(offset, offset + limit),
      total: allLogs.length,
    };
  }

  /**
   * 根据 ID 获取单条审计日志
   */
  async getById(tenantId: string, id: string): Promise<AuditLogEntry | null> {
    const dir = this.getLogDir(tenantId);
    const filePath = path.join(dir, `${id}.json`);

    if (!await existsAsync(filePath)) {
      return null;
    }

    try {
      return JSON.parse(await readFile(filePath, 'utf-8'));
    } catch {
      return null;
    }
  }

  /**
   * 清理过期日志
   *
   * @param maxAgeMs 最大保留时间（毫秒）
   */
  async cleanup(tenantId: string, maxAgeMs: number): Promise<number> {
    const dir = this.getLogDir(tenantId);

    if (!await existsAsync(dir)) {
      return 0;
    }

    const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
    const now = Date.now();
    let deleted = 0;

    for (const file of files) {
      try {
        const content = JSON.parse(await readFile(path.join(dir, file), 'utf-8'));
        const createdAt = new Date(content.createdAt).getTime();

        if (now - createdAt > maxAgeMs) {
          await unlink(path.join(dir, file));
          deleted++;
        }
      } catch {
        // 跳过损坏的文件
      }
    }

    return deleted;
  }
}
