/**
 * 折叠面板 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 折叠面板 组件属性 */
export interface CollapseProps extends BaseProps {
  /**
   * 面板数据
   * @group 基础属性
   * @priority 10
   */
  items?: any[];

  /**
   * 当前激活面板
   * @group 基础属性
   * @priority 11
   */
  activeKey?: string | number | Array<string | number>;

  /**
   * 默认激活面板
   * @group 基础属性
   * @priority 12
   */
  defaultActiveKey?: string | number | Array<string | number>;

  /**
   * 手风琴模式
   * @group 基础属性
   * @priority 13
   */
  accordion?: boolean;

  /**
   * 幽灵模式
   * @group 基础属性
   * @priority 14
   */
  ghost?: boolean;

  /**
   * 边框
   * @group 基础属性
   * @priority 15
   */
  bordered?: boolean;

  /**
   * 图标位置
   * @group 基础属性
   * @priority 16
   * @default "start"
   * @enumLabels start:起始, end:结束
   */
  expandIconPlacement?: 'start' | 'end';

  /**
   * 可折叠触发区域
   * @group 基础属性
   * @priority 17
   * @enumLabels header:标题区域, icon:图标, disabled:禁用
   */
  collapsible?: 'header' | 'icon' | 'disabled';

  /**
   * 尺寸
   * @group 基础属性
   * @priority 18
   * @enumLabels small:小, middle:居中, large:大
   */
  size?: 'small' | 'middle' | 'large';

  /**
   * 销毁隐藏面板
   * @group 高级属性
   * @priority 20
   */
  destroyOnHidden?: boolean;

  /**
   * 样式类名
   * @group 样式
   * @priority 51
   */
  className?: string;

  /**
   * 根节点样式类名
   * @group 样式
   * @priority 52
   */
  rootClassName?: string;
}
