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
  /**
   * 模式
   * @group 基础属性
   * @priority 10
   * @enum ["month","year"]
   */
  mode?: string;

  /**
   * 全屏
   * @group 基础属性
   * @priority 11

   */
  fullscreen?: boolean;
}
