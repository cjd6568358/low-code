/**
 * 级联选择 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 级联选择 组件属性 */
export interface CascaderProps extends BaseProps {
  /**
   * 选项数据
   * @group 基础属性
   * @priority 10

   */
  options?: any[];

  /**
   * 占位提示
   * @group 基础属性
   * @priority 11

   */
  placeholder?: string;

  /**
   * 值
   * @group 基础属性
   * @priority 12

   */
  value?: string[];

  /**
   * 多选
   * @group 基础属性
   * @priority 13

   */
  multiple?: boolean;

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
   * 选中即改变
   * @group 高级属性
   * @priority 21

   */
  changeOnSelect?: boolean;
}
