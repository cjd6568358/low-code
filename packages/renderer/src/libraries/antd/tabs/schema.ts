/**
 * 标签页 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 标签页 组件属性 */
export interface TabsProps extends BaseProps {
  /**
   * 标签数据
   * @group 基础属性
   * @priority 10
   */
  items?: any[];

  /**
   * 标签类型
   * @group 基础属性
   * @priority 11
   * @default 'line'
   */
  type?: 'line' | 'card' | 'editable-card';

  /**
   * 当前激活标签
   * @group 基础属性
   * @priority 12
   */
  activeKey?: string;

  /**
   * 默认激活标签
   * @group 基础属性
   * @priority 13
   */
  defaultActiveKey?: string;

  /**
   * 标签位置
   * @group 基础属性
   * @priority 14
   * @default "top"
   * @ignore 使用 tabPlacement 代替
   */
  tabPosition?: 'top' | 'right' | 'bottom' | 'left';

  /**
   * 标签放置位置
   * @group 基础属性
   * @priority 15
   * @default "top"
   */
  tabPlacement?: 'top' | 'end' | 'bottom' | 'start';

  /**
   * 尺寸
   * @group 基础属性
   * @priority 16
   */
  size?: 'small' | 'middle' | 'large';

  /**
   * 居中排列
   * @group 基础属性
   * @priority 17
   */
  centered?: boolean;

  /**
   * 隐藏添加按钮
   * @group 基础属性
   * @priority 18
   */
  hideAdd?: boolean;

  /**
   * 销毁隐藏面板
   * @group 高级属性
   * @priority 20
   */
  destroyOnHidden?: boolean;

  /**
   * 动画配置
   * @group 高级属性
   * @priority 21
   */
  animated?: boolean | { inkBar?: boolean; tabPane?: boolean };

  /**
   * 方向
   * @group 高级属性
   * @priority 22
   */
  direction?: 'ltr' | 'rtl';

  /**
   * 附加操作栏内容
   * @group 高级属性
   * @priority 23
   */
  tabBarExtraContent?: string | { left?: string; right?: string };

  /**
   * 标签栏间距
   * @group 高级属性
   * @priority 24
   */
  tabBarGutter?: number;

  /**
   * 标签栏样式
   * @group 高级属性
   * @priority 25
   */
  tabBarStyle?: Record<string, unknown>;

  /**
   * 添加图标
   * @group 高级属性
   * @priority 26
   */
  addIcon?: string;

  /**
   * 更多图标
   * @group 高级属性
   * @priority 27
   */
  moreIcon?: string;

  /**
   * 删除图标
   * @group 高级属性
   * @priority 28
   */
  removeIcon?: string;

  /**
   * 下拉菜单配置
   * @group 高级属性
   * @priority 29
   */
  more?: { icon?: string };

  /**
   * 指示器配置
   * @group 高级属性
   * @priority 30
   */
  indicator?: { size?: number | ((ele: number) => number); align?: 'start' | 'center' | 'end' };

  /**
   * 国际化文案
   * @group 高级属性
   * @priority 31
   */
  locale?: { dropdownAriaLabel?: string; removeAriaLabel?: string; addAriaLabel?: string };

  /**
   * 根节点样式类名
   * @group 高级属性
   * @priority 32
   */
  rootClassName?: string;

  /**
   * 组件 ID
   * @group 高级属性
   * @priority 33
   */
  id?: string;
}
