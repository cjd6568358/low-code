/**
 * 空状态 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 空状态 组件属性 */
export interface EmptyProps extends BaseProps {
  /**
   * 描述
   * @group 基础属性
   * @priority 10

   */
  description?: React.ReactNode;

  /**
   * 图片
   * @group 基础属性
   * @priority 11

   */
  image?: React.ReactNode;

  /**
   * 图片样式
   * @group 高级属性
   * @priority 20

   */
  imageStyle?: React.CSSProperties;
}
