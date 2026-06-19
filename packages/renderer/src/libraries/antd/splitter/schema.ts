/**
 * 分隔面板 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 分隔面板 组件属性 */
export interface SplitterProps extends BaseProps {
  /**
   * 布局方向
   * @group 基础属性
   * @priority 10
   * @enum ["horizontal","vertical"]
   */
  layout?: string;

  /**
   * 懒加载
   * @group 高级属性
   * @priority 20

   */
  lazy?: boolean;
}
