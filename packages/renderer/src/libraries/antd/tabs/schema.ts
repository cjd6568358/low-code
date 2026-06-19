/**
 * 标签页 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 标签页 组件属性 */
export interface TabsProps extends BaseProps {
  /**
   * 标签数据
   * @group 基础属性
   * @priority 10

   */
  items?: any[];

  /**
   * 当前标签
   * @group 基础属性
   * @priority 11

   */
  activeKey?: string;

  /**
   * 位置
   * @group 基础属性
   * @priority 12
   * @enum ["top","right","bottom","left"]
   */
  tabPosition?: string;

  /**
   * 类型
   * @group 基础属性
   * @priority 13
   * @enum ["line","card","editable-card"]
   */
  type?: string;

  /**
   * 尺寸
   * @group 基础属性
   * @priority 14
   * @enum ["large","middle","small"]
   */
  size?: string;

  /**
   * 居中
   * @group 基础属性
   * @priority 15

   */
  centered?: boolean;

  /**
   * 动画
   * @group 高级属性
   * @priority 20

   */
  animated?: boolean;
}
