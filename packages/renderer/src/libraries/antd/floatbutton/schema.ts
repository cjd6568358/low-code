/**
 * 悬浮按钮 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 悬浮按钮 组件属性 */
export interface FloatButtonProps extends BaseProps {
  /**
   * 图标
   * @group 基础属性
   * @priority 10
   */
  icon?: string;

  /**
   * 描述（已废弃，请使用 content）
   * @group 基础属性
   * @priority 11
   */
  description?: string;

  /**
   * 内容
   * @group 基础属性
   * @priority 12
   */
  content?: string;

  /**
   * 类型
   * @group 基础属性
   * @priority 13
   * @default "default"
   */
  type?: 'default' | 'primary';

  /**
   * 形状
   * @group 基础属性
   * @priority 14
   * @default "circle"
   */
  shape?: 'circle' | 'square';

  /**
   * 禁用状态
   * @group 基础属性
   * @priority 15
   */
  disabled?: boolean;

  /**
   * HTML 按钮类型
   * @group 基础属性
   * @priority 16
   */
  htmlType?: 'submit' | 'reset' | 'button';

  /**
   * 链接地址
   * @group 高级属性
   * @priority 20
   */
  href?: string;

  /**
   * 链接打开方式
   * @group 高级属性
   * @priority 21
   */
  target?: '_self' | '_blank' | '_parent' | '_top';

  /**
   * 提示
   * @group 高级属性
   * @priority 22
   */
  tooltip?: string;

  /**
   * 徽标
   * @group 高级属性
   * @priority 23
   */
  badge?: object;
}
