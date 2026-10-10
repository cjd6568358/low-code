/**
 * 租户业务数据源
 *
 * 为流程引擎的数据操作节点（创建/更新/查询/删除记录）提供业务表访问能力。
 * 数据源统一落在租户 SQLite 数据库的动态表上（表名 = 数据表 ID）。
 *
 * 架构位置：服务层实现，通过 WorkflowEngineConfig.dataSourceResolver 注入引擎，
 * 引擎层只依赖 WorkflowDataSource 接口，不感知具体存储。
 */

import type {
  DataQueryOptions,
  DataRecord,
  DataSourceResolver,
  FieldValues,
  FilterCondition,
  WorkflowDataSource,
} from '@low-code/workflow';
import {
  insertRecord,
  queryRecordsAdvanced,
  softDeleteRecordsWhere,
  updateRecordsWhere,
} from '@low-code/data';
import type { SqliteDb } from '@low-code/data';

/** 默认数据源名称 */
export const DEFAULT_DATA_SOURCE_NAME = 'default';

/**
 * 基于租户 SQLite 的业务数据源
 */
export class TenantWorkflowDataSource implements WorkflowDataSource {
  constructor(
    private readonly db: SqliteDb,
    /** 租户目录名（tenant_xxx），用于错误提示 */
    private readonly tenantDirName: string,
  ) {}

  /**
   * 创建单条记录
   *
   * @param collection 数据表 ID
   * @param fields 字段值
   * @returns 创建后的完整记录（含自增主键与系统字段）
   */
  async create(collection: string, fields: FieldValues): Promise<DataRecord> {
    if (Object.keys(fields).length === 0) {
      throw new Error(`创建记录失败：未提供字段值（表 ${collection}）`);
    }

    const result = insertRecord(this.db, collection, this.toSqliteData(fields));
    const created = this.find(collection, {
      filter: { id: result.id },
      limit: 1,
    });

    const rows = await created;
    const record = rows[0];
    if (!record) {
      throw new Error(`创建记录后回读失败：表 ${collection}，主键 ${result.id}`);
    }
    return record;
  }

  /**
   * 查询记录列表
   *
   * @param collection 数据表 ID
   * @param options 查询选项（筛选/排序/分页）
   */
  async find(collection: string, options: DataQueryOptions = {}): Promise<DataRecord[]> {
    const { filter, sort, limit, offset } = options;

    const rows = queryRecordsAdvanced(this.db, collection, {
      where: filter as Record<string, unknown> | undefined,
      orderBy: sort,
      limit,
      offset,
    });

    return Array.isArray(rows) ? (rows as DataRecord[]) : [];
  }

  /**
   * 按条件批量更新记录
   *
   * @param collection 数据表 ID
   * @param filter 筛选条件
   * @param fields 待更新字段
   * @returns 影响行数
   */
  async update(
    collection: string,
    filter: FilterCondition,
    fields: FieldValues,
  ): Promise<number> {
    if (Object.keys(fields).length === 0) {
      throw new Error(`更新记录失败：未提供更新字段（表 ${collection}）`);
    }
    return updateRecordsWhere(this.db, collection, filter, this.toSqliteData(fields));
  }

  /**
   * 按条件批量软删除记录
   *
   * @param collection 数据表 ID
   * @param filter 筛选条件
   * @returns 影响行数
   */
  async destroy(collection: string, filter: FilterCondition): Promise<number> {
    return softDeleteRecordsWhere(this.db, collection, filter);
  }

  /**
   * 将字段值转换为 SQLite 可绑定值
   *
   * 对象/数组类型字段（json 列）序列化为 JSON 字符串后入库。
   */
  private toSqliteData(fields: FieldValues): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      data[key] = this.toSqliteValue(value);
    }
    return data;
  }

  /**
   * 单值转换：对象/数组 → JSON 字符串，布尔 → 0/1
   */
  private toSqliteValue(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'object') return JSON.stringify(value);
    return value;
  }

  /** 租户目录名（调试用） */
  get tenant(): string {
    return this.tenantDirName;
  }
}

/**
 * 租户数据源解析器
 *
 * 当前所有数据源均指向租户 SQLite 数据库（默认数据源），
 * 未来接入外部数据源（第三方 API / 其他库）时在此扩展映射表。
 */
export class TenantDataSourceResolver implements DataSourceResolver {
  private readonly dataSource: TenantWorkflowDataSource;

  constructor(db: SqliteDb, tenantDirName: string) {
    this.dataSource = new TenantWorkflowDataSource(db, tenantDirName);
  }

  /**
   * 按名称解析数据源
   *
   * @param dataSourceName 数据源名称（默认 'default'）
   * @returns 数据源实例
   */
  resolve(dataSourceName: string): WorkflowDataSource | undefined {
    if (dataSourceName === DEFAULT_DATA_SOURCE_NAME) {
      return this.dataSource;
    }
    return undefined;
  }
}
