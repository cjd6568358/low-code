/**
 * Button 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承所有公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** Button 组件属性 */
export interface ButtonProps extends BaseProps {
  /**
   * 按钮内容
   * @group 基础属性
   * @priority 1
   */
  children?: React.ReactNode;

  /**
   * 按钮类型
   * @group 基础属性
   * @priority 2
   */
  type?: 'primary' | 'default' | 'dashed' | 'text' | 'link';

  /**
   * HTML 类型
   * @group 基础属性
   * @priority 3
   */
  htmlType?: 'submit' | 'reset' | 'button';

  /**
   * 形状
   * @group 基础属性
   * @priority 4
   */
  shape?: 'default' | 'circle' | 'round';

  /**
   * 加载状态
   * @group 基础属性
   * @priority 5
   */
  loading?: boolean | { delay?: number };

  /**
   * 图标
   * @group 高级属性
   * @priority 10
   */
  icon?: React.ReactNode;

  /**
   * 图标位置
   * @group 高级属性
   * @priority 11
   */
  iconPlacement?: 'start' | 'end';

  /**
   * 幽灵按钮
   * @group 高级属性
   * @priority 12
   */
  ghost?: boolean;

  /**
   * 危险按钮
   * @group 高级属性
   * @priority 13
   */
  danger?: boolean;

  /**
   * 块级按钮
   * @group 高级属性
   * @priority 14
   */
  block?: boolean;

  /**
   * @deprecated 使用 iconPlacement 代替
   * @hidden
   */
  iconPosition?: 'start' | 'end';
}
