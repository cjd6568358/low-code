/**
 * 气泡卡片 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 气泡卡片 组件属性 */
export interface PopoverProps extends BaseProps {
  /**
   * 标题
   * @group 基础属性
   * @priority 10

   */
  title?: React.ReactNode;

  /**
   * 内容
   * @group 基础属性
   * @priority 11

   */
  content?: React.ReactNode;

  /**
   * 位置
   * @group 基础属性
   * @priority 12
   * @enum ["top","left","right","bottom","topLeft","topRight","bottomLeft","bottomRight","leftTop","leftBottom","rightTop","rightBottom"]
   */
  placement?: string;

  /**
   * 触发方式
   * @group 基础属性
   * @priority 13
   * @enum ["hover","focus","click","contextMenu"]
   */
  trigger?: string;

  /**
   * 箭头
   * @group 基础属性
   * @priority 14

   */
  arrow?: boolean;
}
