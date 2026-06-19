/**
 * 二维码 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 二维码 组件属性 */
export interface QRCodeProps extends BaseProps {
  /**
   * 值
   * @group 基础属性
   * @priority 10

   */
  value?: string;

  /**
   * 尺寸
   * @group 基础属性
   * @priority 11

   */
  size?: number;

  /**
   * 图标
   * @group 高级属性
   * @priority 20

   */
  icon?: string;

  /**
   * 颜色
   * @group 高级属性
   * @priority 21

   */
  color?: string;

  /**
   * 背景色
   * @group 高级属性
   * @priority 22

   */
  bgColor?: string;

  /**
   * 状态
   * @group 基础属性
   * @priority 12
   * @enum ["active","expired","loading","scanned"]
   */
  status?: string;
}
