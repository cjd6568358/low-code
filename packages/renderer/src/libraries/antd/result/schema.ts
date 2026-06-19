/**
 * 结果 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 结果 组件属性 */
export interface ResultProps extends BaseProps {
  /**
   * 状态
   * @group 基础属性
   * @priority 10
   * @enum ["success","error","info","warning","404","403","500"]
   */
  status?: string;

  /**
   * 标题
   * @group 基础属性
   * @priority 11

   */
  title?: React.ReactNode;

  /**
   * 副标题
   * @group 基础属性
   * @priority 12

   */
  subTitle?: React.ReactNode;

  /**
   * 额外内容
   * @group 高级属性
   * @priority 20

   */
  extra?: React.ReactNode;

  /**
   * 图标
   * @group 高级属性
   * @priority 21

   */
  icon?: React.ReactNode;
}
