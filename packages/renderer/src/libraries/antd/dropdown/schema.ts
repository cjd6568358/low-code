/**
 * 下拉菜单 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 下拉菜单 组件属性 */
export interface DropdownProps extends BaseProps {
  /**
   * 菜单配置
   * @group 基础属性
   * @priority 10
   */
  menu?: Record<string, unknown>;

  /**
   * 弹出位置
   * @group 基础属性
   * @priority 11
   * @default "bottomLeft"
   * @enumLabels topLeft:左上, topCenter:顶部居中, topRight:右上, bottomLeft:左下, bottomCenter:底部居中, bottomRight:右下, top:顶部, bottom:底部
   */
  placement?: 'topLeft' | 'topCenter' | 'topRight' | 'bottomLeft' | 'bottomCenter' | 'bottomRight' | 'top' | 'bottom';

  /**
   * 触发方式
   * @group 基础属性
   * @priority 12
   * @default ['hover']
   */
  trigger?: ('click' | 'hover' | 'contextMenu')[];

  /**
   * 箭头
   * @group 基础属性
   * @priority 13
   */
  arrow?: boolean | { pointAtCenter?: boolean };

  /**
   * 受控展开状态
   * @group 基础属性
   * @priority 14
   */
  open?: boolean;

  /**
   * 是否禁用
   * @group 基础属性
   * @priority 15
   */
  disabled?: boolean;

  /**
   * 自动聚焦
   * @group 基础属性
   * @priority 16
   */
  autoFocus?: boolean;

  /**
   * 关闭时销毁弹框
   * @group 高级属性
   * @priority 30
   */
  destroyOnHidden?: boolean;

  /**
   * 强制渲染（非懒加载）
   * @group 高级属性
   * @priority 31
   */
  forceRender?: boolean;

  /**
   * 鼠标移入延迟（毫秒）
   * @group 高级属性
   * @priority 32
   */
  mouseEnterDelay?: number;

  /**
   * 鼠标移出延迟（毫秒）
   * @group 高级属性
   * @priority 33
   */
  mouseLeaveDelay?: number;

  /**
   * 自动调整气泡位置（气泡被遮挡时自动翻转）
   * @group 高级属性
   * @priority 34
   */
  autoAdjustOverflow?: boolean;

  /**
   * 弹出动画名称
   * @group 高级属性
   * @priority 35
   */
  transitionName?: string;

  /**
   * 下拉展开时的 CSS 类名
   * @group 高级属性
   * @priority 36
   */
  openClassName?: string;
}
