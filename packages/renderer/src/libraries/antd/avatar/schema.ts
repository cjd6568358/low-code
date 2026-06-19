/**
 * 头像 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 头像 组件属性 */
export interface AvatarProps extends BaseProps {
  /**
   * 图片地址
   * @group 基础属性
   * @priority 10

   */
  src?: string;

  /**
   * 尺寸
   * @group 基础属性
   * @priority 11

   */
  size?: number | string;

  /**
   * 形状
   * @group 基础属性
   * @priority 12
   * @enum ["circle","square"]
   */
  shape?: string;

  /**
   * 图标
   * @group 基础属性
   * @priority 13

   */
  icon?: React.ReactNode;
}
