/**
 * 气泡确认 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 气泡确认 组件属性 */
export interface PopconfirmProps extends BaseProps {
  /**
   * 标题
   * @group 基础属性
   * @priority 10
   */
  title?: string;

  /**
   * 描述
   * @group 基础属性
   * @priority 11
   */
  description?: string;

  /**
   * 确认文案
   * @group 基础属性
   * @priority 12
   */
  okText?: string;

  /**
   * 取消文案
   * @group 基础属性
   * @priority 13
   */
  cancelText?: string;

  /**
   * 位置
   * @group 基础属性
   * @priority 14
   * @default 'top'
   */
  placement?:
    | 'top'
    | 'left'
    | 'right'
    | 'bottom'
    | 'topLeft'
    | 'topRight'
    | 'bottomLeft'
    | 'bottomRight'
    | 'leftTop'
    | 'leftBottom'
    | 'rightTop'
    | 'rightBottom';

  /**
   * 确认类型
   * @group 基础属性
   * @priority 15
   * @default "primary"
   * @enumLabels primary:主要, default:默认, dashed:虚线, text:文字, link:链接
   */
  okType?: 'primary' | 'default' | 'dashed' | 'text' | 'link';

  /**
   * 是否禁用
   * @group 基础属性
   * @priority 16
   */
  disabled?: boolean;

  /**
   * 是否显示取消按钮
   * @group 基础属性
   * @priority 17
   */
  showCancel?: boolean;

  /**
   * 自定义图标
   * @group 基础属性
   * @priority 18
   */
  icon?: string;

  /**
   * 触发方式
   * @group 基础属性
   * @priority 19
   * @default "click"
   * @enumLabels hover:悬浮, focus:聚焦, click:点击, contextMenu:右键菜单
   */
  trigger?: 'hover' | 'focus' | 'click' | 'contextMenu';

  /**
   * 默认是否显示
   * @group 基础属性
   * @priority 20
   */
  defaultOpen?: boolean;

  /**
   * 手动控制显示隐藏
   * @group 基础属性
   * @priority 21
   */
  open?: boolean;

  /**
   * 确认回调
   * @group 事件
   * @priority 30
   */
  onConfirm?: (e?: MouseEvent) => void;

  /**
   * 取消回调
   * @group 事件
   * @priority 31
   */
  onCancel?: (e?: MouseEvent) => void;

  /**
   * 显示隐藏的回调
   * @group 事件
   * @priority 32
   */
  onOpenChange?: (open: boolean) => void;

  /**
   * 气泡卡片点击事件
   * @group 事件
   * @priority 33
   */
  onPopupClick?: (e: MouseEvent) => void;

  /**
   * 动画结束后的回调
   * @group 事件
   * @priority 34
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
   * 展开时的类名
   * @group 样式
   * @priority 54
   */
  openClassName?: string;

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
