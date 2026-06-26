/**
 * 文字提示 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 文字提示 组件属性 */
export interface TooltipProps extends BaseProps {
  /**
   * 提示内容
   * @group 基础属性
   * @priority 10

   */
  title?: string;

  /**
   * 位置
   * @group 基础属性
   * @priority 11
   * @default "top"
   * @enumLabels top:顶部, left:左, right:右, bottom:底部, topLeft:左上, topRight:右上, bottomLeft:左下, bottomRight:右下, leftTop:左上, leftBottom:左下, rightTop:右上, rightBottom:右下
   */
  placement?: 'top' | 'left' | 'right' | 'bottom' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'leftTop' | 'leftBottom' | 'rightTop' | 'rightBottom';

  /**
   * 颜色
   * @group 基础属性
   * @priority 12

   */
  color?: string;

  /**
   * 箭头
   * @group 基础属性
   * @priority 13

   */
  arrow?: boolean;

  /**
   * 提示内容（替代 title）
   * @group 基础属性
   * @priority 14
   */
  overlay?: string;

  /**
   * 受控显隐
   * @group 基础属性
   * @priority 15
   */
  open?: boolean;

  /**
   * 默认显隐
   * @group 基础属性
   * @priority 16
   */
  defaultOpen?: boolean;

  /**
   * 自动调整弹出位置
   * @group 基础属性
   * @priority 17
   */
  autoAdjustOverflow?: boolean;

  /**
   * 关闭时销毁内容
   * @group 基础属性
   * @priority 18
   */
  destroyOnHidden?: boolean;

  /**
   * CSS 类名
   * @group 样式
   * @priority 30
   */
  className?: string;

  /**
   * 根节点类名
   * @group 样式
   * @priority 31
   */
  rootClassName?: string;

  /**
   * 展开时的类名
   * @group 样式
   * @priority 32
   */
  openClassName?: string;
}
