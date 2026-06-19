/**
 * 分页 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 分页 组件属性 */
export interface PaginationProps extends BaseProps {
  /**
   * 总数
   * @group 基础属性
   * @priority 10

   */
  total?: number;

  /**
   * 当前页
   * @group 基础属性
   * @priority 11

   */
  current?: number;

  /**
   * 每页条数
   * @group 基础属性
   * @priority 12

   */
  pageSize?: number;

  /**
   * 显示条数切换
   * @group 基础属性
   * @priority 13

   */
  showSizeChanger?: boolean;

  /**
   * 快速跳转
   * @group 基础属性
   * @priority 14

   */
  showQuickJumper?: boolean;

  /**
   * 显示总数
   * @group 基础属性
   * @priority 15

   */
  showTotal?: boolean;

  /**
   * 简洁模式
   * @group 高级属性
   * @priority 20

   */
  simple?: boolean;

  /**
   * 尺寸
   * @group 高级属性
   * @priority 21
   * @enum ["default","small"]
   */
  size?: string;
}
