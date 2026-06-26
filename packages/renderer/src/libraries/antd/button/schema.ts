/**
 * Button 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承所有公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** Button 组件属性 */
export interface ButtonProps extends BaseProps {
  /**
   * 按钮内容
   * @group 基础属性
   * @priority 1
   */
  children?: string;

  /**
   * 按钮类型
   * @group 基础属性
   * @priority 2
   * @default "default"
   * @enumLabels primary:主要, default:默认, dashed:虚线, text:文字, link:链接
   */
  type?: 'primary' | 'default' | 'dashed' | 'text' | 'link';

  /**
   * HTML 类型
   * @group 基础属性
   * @priority 3
   * @default "button"
   * @enumLabels submit:提交, reset:重置, button:按钮
   */
  htmlType?: 'submit' | 'reset' | 'button';

  /**
   * 形状
   * @group 基础属性
   * @priority 4
   * @default "default"
   * @enumLabels default:默认, circle:圆形, round:圆角, square:方形
   */
  shape?: 'default' | 'circle' | 'round' | 'square';

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
  icon?: string;

  /**
   * 图标位置
   * @group 高级属性
   * @priority 11
   * @default "start"
   * @enumLabels start:起始, end:结束
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
   * 按钮颜色
   * @group 高级属性
   * @priority 15
   * @enumLabels default:默认, primary:主要, danger:危险, blue:蓝色, purple:紫色, cyan:青色, green:绿色, magenta:洋红, pink:粉色, red:红色, orange:橙色, yellow:黄色, volcano:火山色, geekblue:极客蓝, lime:青柠色, gold:金色
   */
  color?: 'default' | 'primary' | 'danger' | 'blue' | 'purple' | 'cyan' | 'green' | 'magenta' | 'pink' | 'red' | 'orange' | 'yellow' | 'volcano' | 'geekblue' | 'lime' | 'gold';

  /**
   * 按钮变体
   * @group 高级属性
   * @priority 16
   * @default "outlined"
   * @enumLabels outlined:描边, dashed:虚线, solid:实心, filled:填充, text:文字, link:链接
   */
  variant?: 'outlined' | 'dashed' | 'solid' | 'filled' | 'text' | 'link';

  /**
   * @ignore 使用 iconPlacement 代替
   */
  iconPosition?: 'start' | 'end';

  /**
   * 点击按钮时的回调
   * @group 事件
   * @priority 80
   */
  onClick?: string;
}
