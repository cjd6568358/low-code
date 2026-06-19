/**
 * 上传 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 上传 组件属性 */
export interface UploadProps extends BaseProps {
  /**
   * 上传地址
   * @group 基础属性
   * @priority 10

   */
  action?: string | ((file: any) => Promise<string>);

  /**
   * 接受类型
   * @group 基础属性
   * @priority 11

   */
  accept?: string;

  /**
   * 多选
   * @group 基础属性
   * @priority 12

   */
  multiple?: boolean;

  /**
   * 最大数量
   * @group 基础属性
   * @priority 13

   */
  maxCount?: number;

  /**
   * 列表类型
   * @group 基础属性
   * @priority 14
   * @enum ["text","picture","picture-card"]
   */
  listType?: string;

  /**
   * 禁用
   * @group 基础属性
   * @priority 15

   */
  disabled?: boolean;

  /**
   * 拖拽上传
   * @group 高级属性
   * @priority 20

   */
  drag?: boolean;
}
