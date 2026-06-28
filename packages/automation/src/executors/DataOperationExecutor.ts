/**
 * 数据操作动作执行器
 *
 * 执行实体记录的 CRUD 操作。
 */

import type { AutomationAction } from '../types/action';
import type { ExecutionContext } from '../types/execution';
import type { DataService } from '../types/engine';
import type { VariableContext } from '../variable/VariableResolver';
import { ActionExecutorBase } from './ActionExecutorBase';

/**
 * 数据操作动作执行器
 *
 * 执行 data_operation 类型的动作，调用数据引擎进行 CRUD 操作。
 */
export class DataOperationExecutor extends ActionExecutorBase {
  private readonly dataService: DataService;

  constructor(dataService: DataService) {
    super();
    this.dataService = dataService;
  }

  /**
   * 执行数据操作动作
   */
  protected async executeAction(
    action: AutomationAction,
    context: ExecutionContext,
    variableContext: VariableContext,
  ): Promise<unknown> {
    if (!action.dataOperation) {
      throw new Error('数据操作动作配置缺失');
    }

    // 解析配置中的变量
    const config = this.resolveConfig(action.dataOperation, variableContext);
    const { entityCode, operation, data, filter } = config;

    switch (operation) {
      case 'create': {
        if (!data) {
          throw new Error('创建操作缺少数据');
        }
        const result = await this.dataService.create(entityCode, data);
        return {
          operation: 'create',
          id: result.id,
          entityCode,
        };
      }

      case 'update': {
        if (!filter) {
          throw new Error('更新操作缺少过滤条件');
        }
        if (!data) {
          throw new Error('更新操作缺少数据');
        }
        const result = await this.dataService.update(entityCode, filter, data);
        return {
          operation: 'update',
          changes: result.changes,
          entityCode,
        };
      }

      case 'delete': {
        if (!filter) {
          throw new Error('删除操作缺少过滤条件');
        }
        const result = await this.dataService.delete(entityCode, filter);
        return {
          operation: 'delete',
          changes: result.changes,
          entityCode,
        };
      }

      default:
        throw new Error(`不支持的数据操作类型: ${operation}`);
    }
  }
}
