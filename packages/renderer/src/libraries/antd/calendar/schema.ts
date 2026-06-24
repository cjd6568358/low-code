/**
 * 日历 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 日历 组件属性 */
export interface CalendarProps extends BaseProps {
  // ==================== 基础属性 ====================

  /**
   * 模式
   * @group 基础属性
   * @priority 10
   * @default "month"
   */
  mode?: 'month' | 'year';

  /**
   * 全屏
   * @group 基础属性
   * @priority 11
   * @default true
   */
  fullscreen?: boolean;

  /**
   * CSS 类名
   * @group 基础属性
   * @priority 12
   */
  className?: string;

  /**
   * 根节点 CSS 类名
   * @group 基础属性
   * @priority 13
   */
  rootClassName?: string;

  /**
   * 显示周数
   * @group 基础属性
   * @priority 14
   */
  showWeek?: boolean;

  /**
   * 当前日期（受控）
   * @group 基础属性
   * @priority 15
   */
  value?: string;

  /**
   * 默认日期
   * @group 基础属性
   * @priority 16
   */
  defaultValue?: string;

  /**
   * 有效日期范围
   * @group 基础属性
   * @priority 17
   */
  validRange?: string[];

  // ==================== 高级属性 ====================

  /**
   * 禁用日期函数表达式
   * @group 高级属性
   * @priority 20
   */
  disabledDate?: string;

  /**
   * 自定义单元格渲染
   * @group 高级属性
   * @priority 21
   */
  cellRender?: string;

  /**
   * 完整单元格渲染
   * @group 高级属性
   * @priority 22
   */
  fullCellRender?: string;

  /**
   * 头部渲染
   * @group 高级属性
   * @priority 23
   */
  headerRender?: string;

  // ==================== 事件 ====================

  /**
   * 日期变化回调
   * @group 事件
   * @priority 80
   */
  onChange?: string;

  /**
   * 面板变化回调
   * @group 事件
   * @priority 81
   */
  onPanelChange?: string;

  /**
   * 选择日期回调
   * @group 事件
   * @priority 82
   */
  onSelect?: string;
}
