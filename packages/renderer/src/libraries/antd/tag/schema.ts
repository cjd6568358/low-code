/**
 * 标签 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 标签 组件属性 */
export interface TagProps extends BaseProps {
  /**
   * 颜色
   * @group 基础属性
   * @priority 10

   */
  color?: string;

  /**
   * 变体风格
   * @group 基础属性
   * @priority 11
   * @enumLabels filled:填充, solid:实心, outlined:描边
   */
  variant?: 'filled' | 'solid' | 'outlined';

  /**
   * 可关闭
   * @group 基础属性
   * @priority 12

   */
  closable?: boolean;

  /**
   * 关闭图标
   * @group 基础属性
   * @priority 13

   */
  closeIcon?: string;

  /**
   * 图标
   * @group 基础属性
   * @priority 14

   */
  icon?: string;

  /**
   * 边框
   * @group 基础属性
   * @priority 15
   * @default true
   */
  bordered?: boolean;

  /**
   * 超链接地址
   * @group 高级属性
   * @priority 20

   */
  href?: string;

  /**
   * 链接打开方式
   * @group 高级属性
   * @priority 21
   * @enumLabels _self:当前窗口, _blank:新窗口, _parent:父窗口, _top:顶层窗口
   */
  target?: '_self' | '_blank' | '_parent' | '_top';

  /**
   * 禁用
   * @group 高级属性
   * @priority 22

   */
  disabled?: boolean;

  /**
   * 关闭回调
   * @group 事件
   * @priority 80

   */
  onClose?: string;
}
