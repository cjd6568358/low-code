/**
 * 文件系统快照服务
 *
 * 封装快照文件操作为 SnapshotService 接口，
 * 用于 WorkflowEngine 的快照管理。
 */

import path from 'path';
import { generateHexId } from '@low-code/shared';
import type { SnapshotService, CaptureSnapshotParams, SnapshotRecord, SnapshotDiff, FieldChange } from '@low-code/workflow';
import { existsAsync, readFile, writeFile, mkdir } from '../utils/fs-utils.js';

/**
 * 文件系统快照服务
 */
export class FileSnapshotService implements SnapshotService {
  constructor(private readonly baseDir: string) {}

  /**
   * 初始化快照服务，确保快照目录存在
   *
   * 必须在使用其他方法前调用。
   */
  async init(): Promise<void> {
    const snapshotsDir = path.join(this.baseDir, 'snapshots');
    if (!await existsAsync(snapshotsDir)) {
      await mkdir(snapshotsDir, { recursive: true });
    }
  }

  /**
   * 捕获快照
   */
  async capture(params: CaptureSnapshotParams): Promise<SnapshotRecord> {
    const id = generateHexId();
    const now = new Date().toISOString();

    // 计算变更字段
    let changedFields: Record<string, FieldChange> | undefined;
    if (params.changedFields) {
      changedFields = params.changedFields;
    } else if (params.snapshotType !== 'INITIAL') {
      // 获取上一个快照，计算变更
      const previousSnapshot = await this.getLatestSnapshot(params.instanceId);
      if (previousSnapshot) {
        changedFields = this.calculateChanges(previousSnapshot.data, params.data);
      }
    }

    const snapshot: SnapshotRecord = {
      id,
      instanceId: params.instanceId,
      nodeId: params.nodeId,
      nodeName: params.nodeName,
      sourceId: params.sourceId,
      sourceTable: params.sourceTable,
      data: params.data,
      changedFields,
      snapshotType: params.snapshotType,
      operatorId: params.operatorId,
      operatorName: params.operatorName,
      comment: params.comment,
      createdAt: now,
    };

    // 写入文件
    const filePath = this.getSnapshotFilePath(id);
    await writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');

    // 同时维护一个实例快照索引
    await this.addToInstanceIndex(params.instanceId, id);

    return snapshot;
  }

  /**
   * 获取最新快照
   */
  async getLatestSnapshot(instanceId: string): Promise<SnapshotRecord | undefined> {
    const snapshots = await this.getSnapshotChain(instanceId);
    return snapshots[snapshots.length - 1];
  }

  /**
   * 获取快照链
   */
  async getSnapshotChain(instanceId: string): Promise<SnapshotRecord[]> {
    const indexFilePath = this.getInstanceIndexPath(instanceId);
    if (!await existsAsync(indexFilePath)) {
      return [];
    }

    try {
      const index: string[] = JSON.parse(await readFile(indexFilePath, 'utf-8'));
      const snapshots: SnapshotRecord[] = [];

      for (const snapshotId of index) {
        const filePath = this.getSnapshotFilePath(snapshotId);
        if (await existsAsync(filePath)) {
          try {
            const snapshot = JSON.parse(await readFile(filePath, 'utf-8'));
            snapshots.push(snapshot);
          } catch {
            // 跳过损坏的快照
          }
        }
      }

      // 按创建时间排序
      snapshots.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      return snapshots;
    } catch {
      return [];
    }
  }

  /**
   * 对比快照
   */
  async diff(snapshotIdA: string, snapshotIdB: string): Promise<SnapshotDiff> {
    const snapshotA = await this.getSnapshotById(snapshotIdA);
    const snapshotB = await this.getSnapshotById(snapshotIdB);

    if (!snapshotA || !snapshotB) {
      return {
        changedFields: {},
        addedFields: [],
        removedFields: [],
        unchangedCount: 0,
        changedCount: 0,
      };
    }

    const changedFields: Record<string, FieldChange> = {};
    const addedFields: string[] = [];
    const removedFields: string[] = [];
    let unchangedCount = 0;

    // 检查新增和修改的字段
    for (const key of Object.keys(snapshotB.data)) {
      const oldValue = snapshotA.data[key];
      const newValue = snapshotB.data[key];

      if (!(key in snapshotA.data)) {
        addedFields.push(key);
        changedFields[key] = { from: undefined, to: newValue };
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changedFields[key] = { from: oldValue, to: newValue };
      } else {
        unchangedCount++;
      }
    }

    // 检查删除的字段
    for (const key of Object.keys(snapshotA.data)) {
      if (!(key in snapshotB.data)) {
        removedFields.push(key);
        changedFields[key] = { from: snapshotA.data[key], to: undefined };
      }
    }

    return {
      changedFields,
      addedFields,
      removedFields,
      unchangedCount,
      changedCount: Object.keys(changedFields).length,
    };
  }

  /**
   * 回写业务表
   */
  async commitToSourceTable(instanceId: string): Promise<void> {
    // 获取终态快照
    const snapshots = await this.getSnapshotChain(instanceId);
    const finalSnapshot = snapshots.find(s => s.snapshotType === 'FINAL') || snapshots[snapshots.length - 1];

    if (!finalSnapshot) {
      return;
    }

    // 写入业务表目录
    const sourceTableDir = path.join(this.baseDir, 'source_tables', finalSnapshot.sourceTable);
    if (!await existsAsync(sourceTableDir)) {
      await mkdir(sourceTableDir, { recursive: true });
    }

    const filePath = path.join(sourceTableDir, `${finalSnapshot.sourceId}.json`);
    const record = {
      ...finalSnapshot.data,
      id: finalSnapshot.sourceId,
      _lastSnapshotId: finalSnapshot.id,
      _committedAt: new Date().toISOString(),
    };

    await writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');
  }

  // ==================== 私有方法 ====================

  /**
   * 获取快照文件路径
   */
  private getSnapshotFilePath(snapshotId: string): string {
    return path.join(this.baseDir, 'snapshots', `snapshot_${snapshotId}.json`);
  }

  /**
   * 获取实例快照索引文件路径
   */
  private getInstanceIndexPath(instanceId: string): string {
    return path.join(this.baseDir, 'snapshots', `index_${instanceId}.json`);
  }

  /**
   * 添加到实例快照索引
   */
  private async addToInstanceIndex(instanceId: string, snapshotId: string): Promise<void> {
    const indexPath = this.getInstanceIndexPath(instanceId);
    let index: string[] = [];

    if (await existsAsync(indexPath)) {
      try {
        index = JSON.parse(await readFile(indexPath, 'utf-8'));
      } catch {
        index = [];
      }
    }

    index.push(snapshotId);
    await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  /**
   * 根据 ID 获取快照
   */
  private async getSnapshotById(snapshotId: string): Promise<SnapshotRecord | undefined> {
    const filePath = this.getSnapshotFilePath(snapshotId);
    if (!await existsAsync(filePath)) {
      return undefined;
    }

    try {
      return JSON.parse(await readFile(filePath, 'utf-8'));
    } catch {
      return undefined;
    }
  }

  /**
   * 计算数据变更
   */
  private calculateChanges(
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>
  ): Record<string, FieldChange> {
    const changes: Record<string, FieldChange> = {};

    // 检查新增和修改的字段
    for (const key of Object.keys(newData)) {
      const oldValue = oldData[key];
      const newValue = newData[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = { from: oldValue, to: newValue };
      }
    }

    // 检查删除的字段
    for (const key of Object.keys(oldData)) {
      if (!(key in newData)) {
        changes[key] = { from: oldData[key], to: undefined };
      }
    }

    return changes;
  }
}
