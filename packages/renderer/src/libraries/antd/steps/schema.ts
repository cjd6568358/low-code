/**
 * 步骤条 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 步骤条 组件属性 */
export interface StepsProps extends BaseProps {
  /**
   * 步骤数据
   * @group 基础属性
   * @priority 10

   */
  items?: any[];

  /**
   * 当前步骤
   * @group 基础属性
   * @priority 11

   */
  current?: number;

  /**
   * 方向
   * @group 基础属性
   * @priority 12
   */
  direction?: 'horizontal' | 'vertical';

  /**
   * 尺寸
   * @group 基础属性
   * @priority 13

  /**
   * 类型
   * @group 基础属性
   * @priority 14
   */
  type?: 'default' | 'navigation' | 'inline';

  /**
   * 状态
   * @group 基础属性
   * @priority 15
   */
  status?: 'wait' | 'process' | 'finish' | 'error';

  /**
   * 点状步骤
   * @group 高级属性
   * @priority 20

   */
  progressDot?: boolean;
}
