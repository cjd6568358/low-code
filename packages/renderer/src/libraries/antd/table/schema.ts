/**
 * 表格 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 表格 组件属性 */
export interface TableProps extends BaseProps {
  /**
   * 数据源
   * @group 基础属性
   * @priority 10

   */
  dataSource?: any[];

  /**
   * 列配置
   * @group 基础属性
   * @priority 11

   */
  columns?: any[];

  /**
   * 边框
   * @group 基础属性
   * @priority 12

   */
  bordered?: boolean;

  /**
   * 加载中
   * @group 基础属性
   * @priority 13

   */
  loading?: boolean;

  /**
   * 尺寸
   * @group 基础属性
   * @priority 14

  /**
   * 分页
   * @group 高级属性
   * @priority 20

   */
  pagination?: object | false;

  /**
   * 滚动
   * @group 高级属性
   * @priority 21

   */
  scroll?: { x?: number; y?: number };

  /**
   * 行选择
   * @group 高级属性
   * @priority 22

   */
  rowSelection?: object;
}
