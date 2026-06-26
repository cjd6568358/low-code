/**
 * 徽标 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 徽标 组件属性 */
export interface BadgeProps extends BaseProps {
  /**
   * 数量
   * @group 基础属性
   * @priority 10

   */
  count?: string;

  /**
   * 红点
   * @group 基础属性
   * @priority 11

   */
  dot?: boolean;

  /**
   * 显示零
   * @group 基础属性
   * @priority 12

   */
  showZero?: boolean;

  /**
   * 封顶数值
   * @group 基础属性
   * @priority 13
   * @default 99
   */
  overflowCount?: number;

  /**
   * 颜色
   * @group 基础属性
   * @priority 14

   */
  color?: string;

  /**
   * 状态
   * @group 基础属性
   * @priority 15
   * @enumLabels success:成功, processing:处理中, default:默认, error:错误, warning:警告
   */
  status?: 'success' | 'processing' | 'default' | 'error' | 'warning';

  /**
   * 文字
   * @group 基础属性
   * @priority 16

   */
  text?: string;

  /**
   * 大小
   * @group 基础属性
   * @priority 17
   * @enumLabels small:小, default:默认, medium:中
   */
  size?: 'small' | 'default' | 'medium';

  /**
   * 偏移量
   * @group 高级属性
   * @priority 20
   */
  offset?: [number | string, number | string];

  /**
   * 鼠标放在状态点上显示的标题
   * @group 高级属性
   * @priority 21

   */
  title?: string;
}
