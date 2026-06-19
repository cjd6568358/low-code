/**
 * 树选择 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 树选择 组件属性 */
export interface TreeSelectProps extends BaseProps {
  /**
   * 树数据
   * @group 基础属性
   * @priority 10

   */
  treeData?: any[];

  /**
   * 占位提示
   * @group 基础属性
   * @priority 11

   */
  placeholder?: string;

  /**
   * 多选
   * @group 基础属性
   * @priority 12

   */
  multiple?: boolean;

  /**
   * 可勾选
   * @group 基础属性
   * @priority 13

   */
  treeCheckable?: boolean;

  /**
   * 允许清除
   * @group 基础属性
   * @priority 14

   */
  allowClear?: boolean;

  /**
   * 可搜索
   * @group 高级属性
   * @priority 20

   */
  showSearch?: boolean;

  /**
   * 禁用
   * @group 基础属性
   * @priority 15

   */
  disabled?: boolean;
}
