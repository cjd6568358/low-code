/**
 * 树形控件 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 树形控件 组件属性 */
export interface TreeProps extends BaseProps {
  /**
   * 树数据
   * @group 基础属性
   * @priority 10

   */
  treeData?: any[];

  /**
   * 可勾选
   * @group 基础属性
   * @priority 11

   */
  checkable?: boolean;

  /**
   * 可拖拽
   * @group 基础属性
   * @priority 12

   */
  draggable?: boolean;

  /**
   * 连接线
   * @group 基础属性
   * @priority 13

   */
  showLine?: boolean;

  /**
   * 默认展开
   * @group 基础属性
   * @priority 14

   */
  defaultExpandAll?: boolean;

  /**
   * 多选
   * @group 基础属性
   * @priority 15

   */
  multiple?: boolean;

  /**
   * 禁用
   * @group 基础属性
   * @priority 16

   */
  disabled?: boolean;
}
