/**
 * 侧边栏 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 侧边栏 组件属性 */
export interface SiderProps extends BaseProps {
  /**
   * 是否折叠
   * @group 基础属性
   * @priority 10
   */
  collapsed?: boolean;

  /**
   * 默认是否折叠
   * @group 基础属性
   * @priority 11
   */
  defaultCollapsed?: boolean;

  /**
   * 可折叠
   * @group 基础属性
   * @priority 12
   */
  collapsible?: boolean;

  /**
   * 翻转箭头
   * @group 基础属性
   * @priority 13
   */
  reverseArrow?: boolean;

  /**
   * 自定义折叠触发器
   * @group 基础属性
   * @priority 14
   */
  trigger?: string;

  /**
   * 宽度
   * @group 基础属性
   * @priority 20
   * @default 200
   */
  width?: number | string;

  /**
   * 折叠宽度
   * @group 基础属性
   * @priority 21
   * @default 80
   */
  collapsedWidth?: number | string;

  /**
   * 零宽度触发器样式
   * @group 基础属性
   * @priority 30
   */
  zeroWidthTriggerStyle?: Record<string, unknown>;

  /**
   * 主题
   * @group 基础属性
   * @priority 31
   * @default "dark"
   */
  theme?: 'light' | 'dark';

  /**
   * 触发响应式布局的断点
   * @group 高级属性
   * @priority 40
   */
  breakpoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

  /**
   * 折叠/展开回调
   * @group 事件
   * @priority 50
   */
  onCollapse?: string;

  /**
   * 断点变化回调
   * @group 事件
   * @priority 51
   */
  onBreakpoint?: string;
}
