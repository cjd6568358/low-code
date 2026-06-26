/**
 * 分段器 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 分段器 组件属性 */
export interface SegmentedProps extends BaseProps {
  /**
   * 选项
   * @group 基础属性
   * @priority 10
   */
  options?: any[];

  /**
   * 值
   * @group 基础属性
   * @priority 11
   */
  value?: string | number;

  /**
   * 默认值
   * @group 基础属性
   * @priority 12
   */
  defaultValue?: string | number;

  /**
   * 撑满
   * @group 基础属性
   * @priority 13
   */
  block?: boolean;

  /**
   * 尺寸
   * @group 基础属性
   * @priority 14
   * @enumLabels small:小, middle:居中, large:大
   */
  size?: 'small' | 'middle' | 'large';

  /**
   * 禁用
   * @group 基础属性
   * @priority 15
   */
  disabled?: boolean;

  /**
   * 竖直排列
   * @group 基础属性
   * @priority 16
   */
  vertical?: boolean;

  /**
   * 形状
   * @group 基础属性
   * @priority 17
   * @enumLabels default:默认, round:圆角
   */
  shape?: 'default' | 'round';

  /**
   * 排列方向
   * @group 基础属性
   * @priority 18
   * @enumLabels ltr:从左到右, rtl:从右到左
   */
  direction?: 'ltr' | 'rtl';

  /**
   * 根节点样式类名
   * @group 样式
   * @priority 51
   */
  rootClassName?: string;
}
