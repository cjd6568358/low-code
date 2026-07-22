/**
 * 自动化执行日志服务
 *
 * 使用 JSON 文件存储执行日志。
 * 存储结构：tenants/{tenantId}/log/automation/{executionId}.json
 */

import path from 'path';
import { existsAsync, readFile, writeFile, readdir, mkdir, unlink } from '../utils/fs-utils.js';

/** 执行日志 */
export interface ExecutionLog {
  executionId: string;
  ruleId: string;
  ruleName: string;
  eventType: string;
  eventSource: string;
  eventData: Record<string, unknown>;
  conditionResult?: Record<string, unknown>;
  actionResults: Array<Record<string, unknown>>;
  status: 'success' | 'partial_success' | 'failed';
  totalDurationMs: number;
  createdAt: string;
}

/** 日志查询结果 */
export interface LogQueryResult {
  logs: ExecutionLog[];
  total: number;
}

/** 日志统计 */
export interface LogStats {
  total: number;
  success: number;
  failed: number;
  partialSuccess: number;
  avgDurationMs: number;
}

/**
 * 自动化日志服务类
 *
 * 所有自动化执行日志统一存储在 tenants/{tenantId}/log/automation/ 目录。
 */
export class AutomationLogService {
  constructor(private readonly tenantsDir: string) {}

  /**
   * 获取日志目录路径
   */
  private getLogDir(tenantId: string): string {
    return path.join(this.tenantsDir, tenantId, 'log', 'automation');
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
   * 保存执行日志
   */
  async saveLog(tenantId: string, log: ExecutionLog): Promise<void> {
    const dir = await this.ensureLogDir(tenantId);
    const filePath = path.join(dir, `${log.executionId}.json`);

    await writeFile(filePath, JSON.stringify(log, null, 2), 'utf-8');
  }

  /**
   * 获取规则的执行日志（分页）
   */
  async getLogs(
    tenantId: string,
    ruleId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<LogQueryResult> {
    const dir = this.getLogDir(tenantId);

    if (!await existsAsync(dir)) {
      return { logs: [], total: 0 };
    }

    const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
    const allLogs: ExecutionLog[] = [];

    for (const file of files) {
      try {
        const content = JSON.parse(await readFile(path.join(dir, file), 'utf-8'));
        if (content.ruleId === ruleId) {
          allLogs.push(content);
        }
      } catch {
        // 跳过损坏的文件
      }
    }

    // 按创建时间倒序
    allLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      logs: allLogs.slice(offset, offset + limit),
      total: allLogs.length,
    };
  }

  /**
   * 根据执行 ID 获取单条日志
   */
  async getById(tenantId: string, executionId: string): Promise<ExecutionLog | null> {
    const dir = this.getLogDir(tenantId);
    const filePath = path.join(dir, `${executionId}.json`);

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
   * 获取规则的执行统计
   */
  async getStats(tenantId: string, ruleId: string): Promise<LogStats> {
    const dir = this.getLogDir(tenantId);

    if (!await existsAsync(dir)) {
      return { total: 0, success: 0, failed: 0, partialSuccess: 0, avgDurationMs: 0 };
    }

    const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
    const stats: LogStats = { total: 0, success: 0, failed: 0, partialSuccess: 0, avgDurationMs: 0 };
    let totalDuration = 0;

    for (const file of files) {
      try {
        const content = JSON.parse(await readFile(path.join(dir, file), 'utf-8'));
        if (content.ruleId === ruleId) {
          stats.total++;
          if (content.status === 'success') stats.success++;
          else if (content.status === 'failed') stats.failed++;
          else if (content.status === 'partial_success') stats.partialSuccess++;
          totalDuration += content.totalDurationMs || 0;
        }
      } catch {
        // 跳过损坏的文件
      }
    }

    stats.avgDurationMs = stats.total > 0 ? Math.round(totalDuration / stats.total) : 0;
    return stats;
  }

  /**
   * 删除日志文件
   */
  async deleteLog(tenantId: string, executionId: string): Promise<boolean> {
    const dir = this.getLogDir(tenantId);
    const filePath = path.join(dir, `${executionId}.json`);

    if (await existsAsync(filePath)) {
      await unlink(filePath);
      return true;
    }

    return false;
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
