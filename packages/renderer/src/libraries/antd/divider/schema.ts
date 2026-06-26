/**
 * 分割线 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 分割线 组件属性 */
export interface DividerProps extends BaseProps {
  /**
   * 方向
   * @group 基础属性
   * @priority 10
   * @default "horizontal"
   * @ignore 使用 orientation 代替
   */
  type?: 'horizontal' | 'vertical';

  /**
   * 文字位置
   * @group 基础属性
   * @priority 11
   * @default "center"
   * @ignore 使用 titlePlacement 代替
   */
  orientation?: 'left' | 'center' | 'right';

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
   * @default true
   */
  plain?: boolean;

  /**
   * 是否垂直
   * @group 基础属性
   * @priority 14
   */
  vertical?: boolean;

  /**
   * 标题位置
   * @group 基础属性
   * @priority 15
   * @default "center"
   * @enumLabels left:左, right:右, center:居中, start:起始, end:结束
   */
  titlePlacement?: 'left' | 'right' | 'center' | 'start' | 'end';

  /**
   * 分割线文字
   * @group 基础属性
   * @priority 16
   */
  children?: string;

  /**
   * 线条变体
   * @group 基础属性
   * @priority 17
   * @default "solid"
   * @enumLabels dashed:虚线, dotted:点线, solid:实心
   */
  variant?: 'dashed' | 'dotted' | 'solid';

  /**
   * 大小
   * @group 基础属性
   * @priority 18
   * @enumLabels small:小, middle:居中, large:大
   */
  size?: 'small' | 'middle' | 'large';
}
