/**
 * 分割线 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 分割线 组件属性 */
export interface DividerProps extends BaseProps {
  /**
   * 方向
   * @group 基础属性
   * @priority 10
   * @enum ["horizontal","vertical"]
   */
  type?: string;

  /**
   * 文字位置
   * @group 基础属性
   * @priority 11
   * @enum ["left","center","right"]
   */
  orientation?: string;

  /**
   * 虚线
   * @group 基础属性
   * @priority 12

   */
  dashed?: boolean;

  /**
   * 纯文字
   * @group 基础属性
   * @priority 13

   */
  plain?: boolean;
}
