/**
 * 更新记录执行器
 *
 * 更新数据表中的记录。
 * 设计器配置：collection（数据表）、filter（ConditionItem[] 匹配条件）、fields（FieldMappingItem[] 更新字段）
 */

import type { ExecutionContext, ExecutionResult } from '../types/execution';
import type { FlowNode } from '../schema';
import { DataOperationExecutor, type DataOperationConfig, type DataOperationResult } from './DataOperationExecutor';

export class UpdateRecordExecutor extends DataOperationExecutor {
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

      // 2. 解析筛选条件和字段值（支持数组和 Record 两种格式）
      const filter = this.resolveFilter(config.filter, context);
      const fields = this.resolveFields(config.fields, context);

      if (Object.keys(filter).length === 0) {
        return {
          success: false,
          error: '未指定筛选条件，为安全起见禁止更新全表',
        };
      }

      if (Object.keys(fields).length === 0) {
        return {
          success: false,
          error: '未指定要更新的字段',
        };
      }

      // 3. 执行更新操作
      const db = context.getDatabase?.(dataSource);
      if (!db) {
        return {
          success: false,
          error: `数据源 ${dataSource} 不可用`,
        };
      }

      const affectedCount = await db.update(collection, filter, fields);

      // 4. 合并结果到流程变量
      const variableUpdates: Record<string, unknown> = {
        [`${currentNode.id}_result`]: { affectedCount },
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
        error: error instanceof Error ? error.message : '更新记录失败',
      };
    }
  }
}

export default UpdateRecordExecutor;
