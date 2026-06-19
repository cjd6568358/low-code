/**
 * 弹性布局 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 弹性布局 组件属性 */
export interface FlexProps extends BaseProps {
  /**
   * 垂直排列
   * @group 基础属性
   * @priority 10

   */
  vertical?: boolean;

  /**
   * 换行
   * @group 基础属性
   * @priority 11
   * @enum ["nowrap","wrap","wrap-reverse"]
   */
  wrap?: string;

  /**
   * 主轴对齐
   * @group 基础属性
   * @priority 12
   * @enum ["flex-start","center","flex-end","space-between","space-around","space-evenly"]
   */
  justify?: string;

  /**
   * 交叉轴对齐
   * @group 基础属性
   * @priority 13
   * @enum ["flex-start","center","flex-end","stretch","baseline"]
   */
  align?: string;

  /**
   * 间距
   * @group 基础属性
   * @priority 14

   */
  gap?: number | string;
}
