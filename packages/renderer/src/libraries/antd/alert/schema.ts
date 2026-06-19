/**
 * 警告提示 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 警告提示 组件属性 */
export interface AlertProps extends BaseProps {
  /**
   * 提示内容
   * @group 基础属性
   * @priority 10

   */
  message?: React.ReactNode;

  /**
   * 描述
   * @group 基础属性
   * @priority 11

   */
  description?: React.ReactNode;

  /**
   * 类型
   * @group 基础属性
   * @priority 12
   * @enum ["success","info","warning","error"]
   */
  type?: string;

  /**
   * 显示图标
   * @group 基础属性
   * @priority 13

   */
  showIcon?: boolean;

  /**
   * 可关闭
   * @group 基础属性
   * @priority 14

   */
  closable?: boolean;

  /**
   * 横幅
   * @group 高级属性
   * @priority 20

   */
  banner?: boolean;
}
