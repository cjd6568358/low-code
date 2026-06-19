/**
 * 间距 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 间距 组件属性 */
export interface SpaceProps extends BaseProps {
  /**
   * 方向
   * @group 基础属性
   * @priority 10
   * @enum ["vertical","horizontal"]
   */
  direction?: string;

  /**
   * 间距大小
   * @group 基础属性
   * @priority 11

   */
  size?: number | string;

  /**
   * 自动换行
   * @group 基础属性
   * @priority 12

   */
  wrap?: boolean;

  /**
   * 对齐
   * @group 基础属性
   * @priority 13
   * @enum ["start","end","center","baseline"]
   */
  align?: string;

  /**
   * 分隔符
   * @group 高级属性
   * @priority 20

   */
  split?: React.ReactNode;
}
