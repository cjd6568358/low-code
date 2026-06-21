/**
 * 描述列表 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 描述列表 组件属性 */
export interface DescriptionsProps extends BaseProps {
  /**
   * 数据项
   * @group 基础属性
   * @priority 10

   */
  items?: any[];

  /**
   * 列数
   * @group 基础属性
   * @priority 11

   */
  column?: number;

  /**
   * 边框
   * @group 基础属性
   * @priority 12

   */
  bordered?: boolean;

  /**
   * 布局
   * @group 基础属性
   * @priority 13
   */
  layout?: 'horizontal' | 'vertical';

  /**
   * 尺寸
   * @group 基础属性
   * @priority 14

  /**
   * 标题
   * @group 基础属性
   * @priority 15

   */
  title?: string;
}
