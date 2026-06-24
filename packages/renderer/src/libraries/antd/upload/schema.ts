/**
 * 上传 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 文件列表显示配置 */
interface ShowUploadList {
  /** 额外信息 */
  extra?: string;
  /** 是否显示删除图标 */
  showRemoveIcon?: boolean;
  /** 是否显示预览图标 */
  showPreviewIcon?: boolean;
  /** 是否显示下载图标 */
  showDownloadIcon?: boolean;
  /** 自定义删除图标 */
  removeIcon?: string;
  /** 自定义下载图标 */
  downloadIcon?: string;
  /** 自定义预览图标 */
  previewIcon?: string;
}

/** 上传 组件属性 */
export interface UploadProps extends BaseProps {
  // ==================== 基础属性 ====================

  /**
   * 上传地址
   * @group 基础属性
   * @priority 10
   */
  action?: string | ((file: any) => Promise<string>);

  /**
   * 上传类型
   * @group 基础属性
   * @priority 11
   * @no-binding
   */
  type?: 'drag' | 'select';

  /**
   * 接受类型
   * @group 基础属性
   * @priority 12
   */
  accept?: string;

  /**
   * 多选
   * @group 基础属性
   * @priority 13
   */
  multiple?: boolean;

  /**
   * 最大数量
   * @group 基础属性
   * @priority 14
   */
  maxCount?: number;

  /**
   * 列表类型
   * @group 基础属性
   * @priority 15
   * @no-binding
   * @default "text"
   */
  listType?: 'text' | 'picture' | 'picture-card' | 'picture-circle';

  /**
   * 禁用
   * @group 基础属性
   * @priority 16
   */
  disabled?: boolean;

  /**
   * 支持上传文件夹
   * @group 基础属性
   * @priority 17
   * @no-binding
   */
  directory?: boolean;

  /**
   * 文件选择点击行为
   * @group 基础属性
   * @priority 18
   * @no-binding
   */
  openFileDialogOnClick?: boolean;

  // ==================== 上传配置 ====================

  /**
   * 上传请求方式
   * @group 基础属性
   * @priority 20
   * @no-binding
   */
  method?: 'POST' | 'PUT' | 'PATCH' | 'post' | 'put' | 'patch';

  /**
   * 附加请求头
   * @group 基础属性
   * @priority 21
   * @no-binding
   */
  headers?: Record<string, string>;

  /**
   * 附加请求参数
   * @group 基础属性
   * @priority 22
   * @no-binding
   */
  data?: Record<string, unknown>;

  /**
   * 携带 Cookie
   * @group 基础属性
   * @priority 23
   * @no-binding
   */
  withCredentials?: boolean;

  /**
   * 文件选择器 capture 属性
   * @group 基础属性
   * @priority 24
   * @no-binding
   */
  capture?: 'user' | 'environment';

  // ==================== 展示配置 ====================

  /**
   * 文件列表显示配置
   * @group 基础属性
   * @priority 30
   * @no-binding
   */
  showUploadList?: boolean | ShowUploadList;

  /**
   * 自定义类名
   * @group 基础属性
   * @priority 31
   * @no-binding
   */
  className?: string;

  /**
   * DOM 元素 ID
   * @group 基础属性
   * @priority 32
   * @no-binding
   */
  id?: string;
}
