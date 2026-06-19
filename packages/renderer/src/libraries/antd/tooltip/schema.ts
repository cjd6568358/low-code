/**
 * 文字提示 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 文字提示 组件属性 */
export interface TooltipProps extends BaseProps {
  /**
   * 提示内容
   * @group 基础属性
   * @priority 10

   */
  title?: React.ReactNode;

  /**
   * 位置
   * @group 基础属性
   * @priority 11
   * @enum ["top","left","right","bottom","topLeft","topRight","bottomLeft","bottomRight","leftTop","leftBottom","rightTop","rightBottom"]
   */
  placement?: string;

  /**
   * 颜色
   * @group 基础属性
   * @priority 12

   */
  color?: string;

  /**
   * 箭头
   * @group 基础属性
   * @priority 13

   */
  arrow?: boolean;
}
