/**
 * 快照引擎
 * 负责流程快照的捕获、查询和管理
 */

import type {
  SnapshotService,
  CaptureSnapshotParams,
  SnapshotRecord,
  SnapshotDiff,
  FieldChange,
} from '../types/engine';

/** 快照查询参数 */
export interface SnapshotQueryParams {
  instanceId?: string;
  nodeId?: string;
  sourceTable?: string;
  sourceId?: string;
  snapshotType?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
}

/** 快照统计 */
export interface SnapshotStats {
  total: number;
  byType: Record<string, number>;
  latestSnapshot?: SnapshotRecord;
  earliestSnapshot?: SnapshotRecord;
}

/**
 * 快照引擎
 */
export class SnapshotEngine {
  constructor(private readonly snapshotService: SnapshotService) {}

  /**
   * 捕获快照
   */
  async capture(params: CaptureSnapshotParams): Promise<SnapshotRecord> {
    // 计算变更字段
    let changedFields: Record<string, FieldChange> | undefined;

    if (params.previousSnapshotId) {
      const previousSnapshot = await this.snapshotService.getLatest(params.instanceId);
      if (previousSnapshot) {
        changedFields = this.calculateChanges(previousSnapshot.data, params.data);
      }
    }

    // 捕获快照
    return this.snapshotService.capture({
      ...params,
      changedFields,
    });
  }

  /**
   * 获取最新快照
   */
  async getLatest(instanceId: string): Promise<SnapshotRecord | undefined> {
    return this.snapshotService.getLatest(instanceId);
  }

  /**
   * 获取快照链
   */
  async getChain(instanceId: string): Promise<SnapshotRecord[]> {
    return this.snapshotService.getChain(instanceId);
  }

  /**
   * 对比快照
   */
  async diff(snapshotIdA: string, snapshotIdB: string): Promise<SnapshotDiff> {
    return this.snapshotService.diff(snapshotIdA, snapshotIdB);
  }

  /**
   * 回写业务表
   */
  async commitToSourceTable(instanceId: string): Promise<void> {
    return this.snapshotService.commitToSourceTable(instanceId);
  }

  /**
   * 计算数据变更
   */
  calculateChanges(
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>
  ): Record<string, FieldChange> {
    const changes: Record<string, FieldChange> = {};

    // 检查新增和修改的字段
    for (const key of Object.keys(newData)) {
      const oldValue = oldData[key];
      const newValue = newData[key];

      if (this.isValueChanged(oldValue, newValue)) {
        changes[key] = {
          from: oldValue,
          to: newValue,
        };
      }
    }

    // 检查删除的字段
    for (const key of Object.keys(oldData)) {
      if (!(key in newData)) {
        changes[key] = {
          from: oldData[key],
          to: undefined,
        };
      }
    }

    return changes;
  }

  /**
   * 计算子表单变更
   */
  calculateSubFormChanges(
    oldData: unknown[],
    newData: unknown[]
  ): Array<{
    action: 'add' | 'update' | 'delete';
    index: number;
    field?: string;
    from?: unknown;
    to?: unknown;
    value?: unknown;
  }> {
    const changes: Array<{
      action: 'add' | 'update' | 'delete';
      index: number;
      field?: string;
      from?: unknown;
      to?: unknown;
      value?: unknown;
    }> = [];

    const maxLength = Math.max(oldData.length, newData.length);

    for (let i = 0; i < maxLength; i++) {
      if (i >= oldData.length) {
        // 新增行
        changes.push({
          action: 'add',
          index: i,
          value: newData[i],
        });
      } else if (i >= newData.length) {
        // 删除行
        changes.push({
          action: 'delete',
          index: i,
          value: oldData[i],
        });
      } else {
        // 检查行内字段变更
        const oldRow = oldData[i] as Record<string, unknown>;
        const newRow = newData[i] as Record<string, unknown>;

        if (typeof oldRow === 'object' && typeof newRow === 'object') {
          const rowChanges = this.calculateChanges(oldRow, newRow);
          for (const [field, change] of Object.entries(rowChanges)) {
            changes.push({
              action: 'update',
              index: i,
              field,
              from: change.from,
              to: change.to,
            });
          }
        } else if (oldData[i] !== newData[i]) {
          changes.push({
            action: 'update',
            index: i,
            from: oldData[i],
            to: newData[i],
          });
        }
      }
    }

    return changes;
  }

  /**
   * 判断值是否变更
   */
  private isValueChanged(oldValue: unknown, newValue: unknown): boolean {
    // 处理 undefined/null
    if (oldValue == null && newValue == null) {
      return false;
    }
    if (oldValue == null || newValue == null) {
      return true;
    }

    // 处理数组
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      if (oldValue.length !== newValue.length) {
        return true;
      }
      for (let i = 0; i < oldValue.length; i++) {
        if (this.isValueChanged(oldValue[i], newValue[i])) {
          return true;
        }
      }
      return false;
    }

    // 处理对象
    if (typeof oldValue === 'object' && typeof newValue === 'object') {
      const oldKeys = Object.keys(oldValue as object);
      const newKeys = Object.keys(newValue as object);

      if (oldKeys.length !== newKeys.length) {
        return true;
      }

      for (const key of oldKeys) {
        if (!(key in (newValue as object))) {
          return true;
        }
        if (this.isValueChanged(
          (oldValue as Record<string, unknown>)[key],
          (newValue as Record<string, unknown>)[key]
        )) {
          return true;
        }
      }

      return false;
    }

    // 处理基本类型
    return oldValue !== newValue;
  }

  /**
   * 合并快照数据
   */
  mergeSnapshotData(
    baseData: Record<string, unknown>,
    changes: Record<string, FieldChange>
  ): Record<string, unknown> {
    const merged = { ...baseData };

    for (const [key, change] of Object.entries(changes)) {
      if (change.to === undefined) {
        delete merged[key];
      } else {
        merged[key] = change.to;
      }
    }

    return merged;
  }

  /**
   * 重建快照数据
   * 从初始快照开始，逐步应用变更
   */
  async rebuildSnapshotData(
    instanceId: string,
    targetSnapshotId?: string
  ): Promise<Record<string, unknown>> {
    const chain = await this.getChain(instanceId);
    if (chain.length === 0) {
      return {};
    }

    // 找到初始快照
    const initialSnapshot = chain.find(s => s.snapshotType === 'INITIAL');
    if (!initialSnapshot) {
      return chain[0].data;
    }

    let currentData = { ...initialSnapshot.data };

    // 逐步应用变更
    for (let i = 1; i < chain.length; i++) {
      const snapshot = chain[i];

      if (targetSnapshotId && snapshot.id === targetSnapshotId) {
        break;
      }

      if (snapshot.changedFields) {
        currentData = this.mergeSnapshotData(currentData, snapshot.changedFields);
      } else {
        // 如果没有变更记录，使用全量数据
        currentData = { ...snapshot.data };
      }
    }

    return currentData;
  }
}
