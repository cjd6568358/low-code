/**
 * 间距 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 间距 组件属性 */
export interface SpaceProps extends BaseProps {
  /**
   * 方向
   * @group 基础属性
   * @priority 10
   */
  direction?: 'vertical' | 'horizontal';

  /**
   * 间距大小
   * @group 基础属性
   * @priority 11

   */
  size?: number | string;

  /**
   * 自动换行
   * @group 基础属性
   * @priority 12

   */
  wrap?: boolean;

  /**
   * 对齐
   * @group 基础属性
   * @priority 13
   */
  align?: 'start' | 'end' | 'center' | 'baseline';

  /**
   * 分隔符
   * @group 高级属性
   * @priority 20

   */
  split?: string;
}
