/**
 * 穿梭框 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 穿梭框 组件属性 */
export interface TransferProps extends BaseProps {
  /**
   * 数据源
   * @group 基础属性
   * @priority 10

   */
  dataSource?: any[];

  /**
   * 标题
   * @group 基础属性
   * @priority 11

   */
  titles?: [string, string];

  /**
   * 目标列表
   * @group 基础属性
   * @priority 12

   */
  targetKeys?: string[];

  /**
   * 可搜索
   * @group 基础属性
   * @priority 13

   */
  showSearch?: boolean;

  /**
   * 单向
   * @group 高级属性
   * @priority 20

   */
  oneWay?: boolean;

  /**
   * 禁用
   * @group 基础属性
   * @priority 14

   */
  disabled?: boolean;
}
