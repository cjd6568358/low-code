/**
 * 进度条 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 进度条 组件属性 */
export interface ProgressProps extends BaseProps {
  /**
   * 百分比
   * @group 基础属性
   * @priority 10

   */
  percent?: number;

  /**
   * 类型
   * @group 基础属性
   * @priority 11
   * @enum ["line","circle","dashboard"]
   */
  type?: string;

  /**
   * 状态
   * @group 基础属性
   * @priority 12
   * @enum ["success","exception","normal","active"]
   */
  status?: string;

  /**
   * 显示信息
   * @group 基础属性
   * @priority 13

   */
  showInfo?: boolean;

  /**
   * 颜色
   * @group 高级属性
   * @priority 20

   */
  strokeColor?: string;

  /**
   * 轨道颜色
   * @group 高级属性
   * @priority 21

   */
  trailColor?: string;

  /**
   * 尺寸
   * @group 高级属性
   * @priority 22

   */
  size?: number | [number, number];
}
