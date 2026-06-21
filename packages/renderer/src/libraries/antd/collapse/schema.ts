/**
 * 折叠面板 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 折叠面板 组件属性 */
export interface CollapseProps extends BaseProps {
  /**
   * 面板数据
   * @group 基础属性
   * @priority 10

   */
  items?: any[];

  /**
   * 手风琴
   * @group 基础属性
   * @priority 11

   */
  accordion?: boolean;

  /**
   * 幽灵模式
   * @group 基础属性
   * @priority 12

   */
  ghost?: boolean;

  /**
   * 边框
   * @group 基础属性
   * @priority 13

   */
  bordered?: boolean;

  /**
   * 图标位置
   * @group 基础属性
   * @priority 14
   */
  expandIconPosition?: 'left' | 'right';
}
