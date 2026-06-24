/**
 * 导航菜单 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 导航菜单 组件属性 */
export interface MenuProps extends BaseProps {
  /**
   * 菜单数据
   * @group 基础属性
   * @priority 10
   */
  items?: any[];

  /**
   * 模式
   * @group 基础属性
   * @priority 11
   * @default 'vertical'
   */
  mode?: 'vertical' | 'horizontal' | 'inline';

  /**
   * 主题
   * @group 基础属性
   * @priority 12
   * @default "light"
   */
  theme?: 'light' | 'dark';

  /**
   * 默认选中
   * @group 基础属性
   * @priority 13
   */
  defaultSelectedKeys?: string[];

  /**
   * 默认展开
   * @group 基础属性
   * @priority 14
   */
  defaultOpenKeys?: string[];

  /**
   * 当前选中
   * @group 基础属性
   * @priority 15
   */
  selectedKeys?: string[];

  /**
   * 当前展开
   * @group 基础属性
   * @priority 16
   */
  openKeys?: string[];

  /**
   * 是否可选中
   * @group 基础属性
   * @priority 17
   */
  selectable?: boolean;

  /**
   * 是否允许多选
   * @group 基础属性
   * @priority 18
   */
  multiple?: boolean;

  /**
   * 是否禁用
   * @group 基础属性
   * @priority 19
   */
  disabled?: boolean;

  /**
   * 内联缩进宽度
   * @group 基础属性
   * @priority 20
   */
  inlineIndent?: number;

  /**
   * 内联菜单是否收起
   * @group 基础属性
   * @priority 21
   */
  inlineCollapsed?: boolean;

  /**
   * 文字方向
   * @group 高级属性
   * @priority 30
   */
  direction?: 'ltr' | 'rtl';

  /**
   * 子菜单打开延迟（毫秒）
   * @group 高级属性
   * @priority 31
   */
  subMenuOpenDelay?: number;

  /**
   * 子菜单关闭延迟（毫秒）
   * @group 高级属性
   * @priority 32
   */
  subMenuCloseDelay?: number;

  /**
   * 子菜单触发方式
   * @group 高级属性
   * @priority 33
   */
  triggerSubMenuAction?: 'click' | 'hover';

  /**
   * 是否强制渲染子菜单
   * @group 高级属性
   * @priority 34
   */
  forceSubMenuRender?: boolean;

  /**
   * 菜单项图标
   * @group 高级属性
   * @priority 35
   */
  itemIcon?: string;

  /**
   * 展开图标
   * @group 高级属性
   * @priority 36
   */
  expandIcon?: string;

  /**
   * 溢出指示器内容
   * @group 高级属性
   * @priority 37
   */
  overflowedIndicator?: string;

  /**
   * 提示配置，false 可关闭
   * @group 高级属性
   * @priority 38
   */
  tooltip?: false | Record<string, unknown>;

  /**
   * 根节点样式类名
   * @group 高级属性
   * @priority 39
   */
  rootClassName?: string;
}
