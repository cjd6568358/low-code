/**
 * 加载中 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 加载中 组件属性 */
export interface SpinProps extends BaseProps {
  /**
   * 加载中
   * @group 基础属性
   * @priority 10
   */
  spinning?: boolean;

  /**
   * 尺寸
   * @group 基础属性
   * @priority 11
   * @enumLabels small:小, medium:中, large:大
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * 提示文案（已废弃，建议使用 description）
   * @group 基础属性
   * @priority 12
   */
  tip?: string;

  /**
   * 描述文案
   * @group 基础属性
   * @priority 13
   */
  description?: string;

  /**
   * 延迟显示加载效果的时间（毫秒），防止闪烁
   * @group 高级属性
   * @priority 20
   */
  delay?: number;

  /**
   * 自定义加载指示器
   * @group 高级属性
   * @priority 21
   */
  indicator?: string;

  /**
   * 全屏加载
   * @group 高级属性
   * @priority 22
   */
  fullscreen?: boolean;

  /**
   * 进度百分比，auto 时自动计算
   * @group 高级属性
   * @priority 23
   */
  percent?: number | 'auto';
}
