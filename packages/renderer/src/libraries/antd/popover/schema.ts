/**
 * 气泡卡片 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 气泡卡片 组件属性 */
export interface PopoverProps extends BaseProps {
  /**
   * 标题
   * @group 基础属性
   * @priority 10
   */
  title?: string;

  /**
   * 内容
   * @group 基础属性
   * @priority 11
   */
  content?: string;

  /**
   * 位置
   * @group 基础属性
   * @priority 12
   * @default "top"
   */
  placement?: 'top' | 'left' | 'right' | 'bottom' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'leftTop' | 'leftBottom' | 'rightTop' | 'rightBottom';

  /**
   * 触发方式
   * @group 基础属性
   * @priority 13
   * @default 'hover'
   */
  trigger?: 'hover' | 'focus' | 'click' | 'contextMenu';

  /**
   * 箭头
   * @group 基础属性
   * @priority 14
   */
  arrow?: boolean | { pointAtCenter?: boolean };

  /**
   * 默认是否显示
   * @group 基础属性
   * @priority 15
   */
  defaultOpen?: boolean;

  /**
   * 手动控制显示隐藏
   * @group 基础属性
   * @priority 16
   */
  open?: boolean;

  /**
   * 显示隐藏的回调
   * @group 事件
   * @priority 20
   */
  onOpenChange?: (open: boolean) => void;

  /**
   * 动画结束后的回调
   * @group 事件
   * @priority 21
   */
  afterOpenChange?: (open: boolean) => void;

  /**
   * 背景颜色
   * @group 样式
   * @priority 51
   */
  color?: string;

  /**
   * CSS 类名
   * @group 样式
   * @priority 52
   */
  className?: string;

  /**
   * 根节点 CSS 类名
   * @group 样式
   * @priority 53
   */
  rootClassName?: string;

  /**
   * 气泡被遮挡时自动调整位置
   * @group 高级属性
   * @priority 90
   */
  autoAdjustOverflow?: boolean;

  /**
   * 关闭后是否销毁子节点
   * @group 高级属性
   * @priority 91
   */
  destroyOnHidden?: boolean;

  /**
   * 鼠标移入延迟（毫秒）
   * @group 高级属性
   * @priority 92
   */
  mouseEnterDelay?: number;

  /**
   * 鼠标移出延迟（毫秒）
   * @group 高级属性
   * @priority 93
   */
  mouseLeaveDelay?: number;
}
