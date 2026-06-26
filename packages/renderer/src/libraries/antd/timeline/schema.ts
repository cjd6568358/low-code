/**
 * 时间轴 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 时间轴 组件属性 */
export interface TimelineProps extends BaseProps {
  /**
   * 数据项
   * @group 基础属性
   * @priority 10
   */
  items?: object[];

  /**
   * 模式
   * @group 基础属性
   * @priority 11
   * @default "start"
   * @enumLabels start:起始, alternate:交替, end:结束, left:左, right:右
   */
  mode?: 'start' | 'alternate' | 'end' | 'left' | 'right';

  /**
   * 排列方向
   * @group 基础属性
   * @priority 12
   * @default "vertical"
   * @enumLabels horizontal:水平, vertical:垂直
   */
  orientation?: 'horizontal' | 'vertical';

  /**
   * 样式变体
   * @group 基础属性
   * @priority 13
   * @default "outlined"
   * @enumLabels filled:填充, outlined:描边
   */
  variant?: 'filled' | 'outlined';

  /**
   * 标题占位列数
   * @group 基础属性
   * @priority 14
   */
  titleSpan?: string | number;

  /**
   * 自定义类名
   * @group 样式
   * @priority 51
   */
  className?: string;

  /**
   * 根节点附加类名
   * @group 样式
   * @priority 52
   */
  rootClassName?: string;

  /**
   * 加载中
   * @group 高级属性
   * @priority 20
   */
  pending?: boolean;

  /**
   * 反向
   * @group 高级属性
   * @priority 21
   */
  reverse?: boolean;
}
