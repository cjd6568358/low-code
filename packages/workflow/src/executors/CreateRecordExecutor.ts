/**
 * 创建记录执行器
 *
 * 在数据表中创建新记录。
 * 设计器配置：collection（数据表）、fields（FieldMappingItem[] 字段赋值）
 */

import type { ExecutionContext, ExecutionResult } from '../types/execution';
import type { FlowNode } from '../schema';
import { DataOperationExecutor, type DataOperationConfig, type DataOperationResult } from './DataOperationExecutor';

export class CreateRecordExecutor extends DataOperationExecutor {
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { currentNode, instance } = context;
    const config = this.getDataOperationConfig(currentNode);
    const startTime = Date.now();

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

      // 2. 解析字段值（支持 FieldMappingItem[] 和 Record 两种格式）
      const fields = this.resolveFields(config.fields, context);

      if (Object.keys(fields).length === 0) {
        return {
          success: false,
          error: '未指定要创建的字段',
        };
      }

      // 3. 执行创建操作
      const db = context.getDatabase?.(dataSource);
      if (!db) {
        return {
          success: false,
          error: `数据源 ${dataSource} 不可用`,
        };
      }

      const record = await db.create(collection, fields);

      // 4. 合并结果到流程变量
      const variableUpdates: Record<string, unknown> = {
        [`${currentNode.id}_result`]: { record, affectedCount: 1 },
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
        error: error instanceof Error ? error.message : '创建记录失败',
      };
    }
  }
}

export default CreateRecordExecutor;
