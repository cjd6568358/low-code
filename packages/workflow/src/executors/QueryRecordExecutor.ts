/**
 * 查询记录执行器
 *
 * 从数据表中查询记录。
 * 设计器配置：collection（数据表）、filter（ConditionItem[] 筛选条件）、sort、pagination
 */

import type { ExecutionContext, ExecutionResult } from '../types/execution';
import type { FlowNode } from '../schema';
import { DataOperationExecutor, type DataOperationConfig, type DataOperationResult } from './DataOperationExecutor';

export class QueryRecordExecutor extends DataOperationExecutor {
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { currentNode, instance } = context;
    const config = this.getDataOperationConfig(currentNode);

    try {
      // 1. 解析配置
      const collection = config.collection;
      const dataSource = config.dataSource || 'default';

      if (!collection) {
        return {
          success: false,
          error: '未指定数据表',
        };
      }

      // 2. 解析查询参数（支持数组和 Record 两种格式）
      const filter = this.resolveFilter(config.filter, context);
      const sort = config.sort || {};
      const pagination = config.pagination || {};

      // 3. 执行查询操作
      const db = context.getDatabase?.(dataSource);
      if (!db) {
        return {
          success: false,
          error: `数据源 ${dataSource} 不可用`,
        };
      }

      const records = await db.find(collection, {
        filter,
        sort,
        limit: pagination.limit,
        offset: pagination.offset,
      });

      // 4. 合并结果到流程变量
      const variableUpdates: Record<string, unknown> = {
        [`${currentNode.id}_result`]: {
          records,
          record: records.length > 0 ? records[0] : undefined,
          affectedCount: records.length,
        },
      };
      await this.engine['mergeVariables'](instance.id, variableUpdates);

      // 5. 获取下一个节点
      const nextNodes = this.getNextNodes(context);

      return {
        success: true,
        nextNodes,
        variableUpdates,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '查询记录失败',
      };
    }
  }
}

export default QueryRecordExecutor;
