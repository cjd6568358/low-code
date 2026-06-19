/**
 * 文本 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 文本 组件属性 */
export interface TextProps extends BaseProps {
  /**
   * 文本内容
   * @group 基础属性
   * @priority 10

   */
  children?: React.ReactNode;

  /**
   * 文本类型
   * @group 基础属性
   * @priority 11
   * @enum ["secondary","success","warning","danger"]
   */
  type?: string;

  /**
   * 代码样式
   * @group 基础属性
   * @priority 12

   */
  code?: boolean;

  /**
   * 标记样式
   * @group 基础属性
   * @priority 13

   */
  mark?: boolean;

  /**
   * 下划线
   * @group 基础属性
   * @priority 14

   */
  underline?: boolean;

  /**
   * 删除线
   * @group 基础属性
   * @priority 15

   */
  delete?: boolean;

  /**
   * 加粗
   * @group 基础属性
   * @priority 16

   */
  strong?: boolean;

  /**
   * 斜体
   * @group 基础属性
   * @priority 17

   */
  italic?: boolean;
}
