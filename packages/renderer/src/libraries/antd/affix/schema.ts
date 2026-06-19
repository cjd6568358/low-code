/**
 * 固钉 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 固钉 组件属性 */
export interface AffixProps extends BaseProps {
  /**
   * 偏移顶部
   * @group 基础属性
   * @priority 10

   */
  offsetTop?: number;

  /**
   * 偏移底部
   * @group 基础属性
   * @priority 11

   */
  offsetBottom?: number;

  /**
   * 目标容器
   * @group 高级属性
   * @priority 20

   */
  target?: () => HTMLElement;
}
