/**
 * 表单 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 表单 组件属性 */
export interface FormProps extends BaseProps {
  // === 布局 ===

  /**
   * 布局方式
   * @group 基础属性
   * @priority 10
   * @no-binding
   * @default "horizontal"
   * @enumLabels horizontal:水平, vertical:垂直, inline:内联
   */
  layout?: 'horizontal' | 'vertical' | 'inline';

  /**
   * 标签对齐
   * @group 基础属性
   * @priority 11
   * @no-binding
   * @default 'right'
   * @enumLabels left:左, right:右
   */
  labelAlign?: 'left' | 'right';

  /**
   * 标签列宽
   * @group 基础属性
   * @priority 12
   * @no-binding
   */
  labelCol?: object;

  /**
   * 内容列宽
   * @group 基础属性
   * @priority 13
   * @no-binding
   */
  wrapperCol?: object;

  /**
   * 标签自动换行
   * @group 基础属性
   * @priority 14
   * @no-binding
   */
  labelWrap?: boolean;

  // === 显示 ===

  /**
   * 显示冒号
   * @group 基础属性
   * @priority 20
   * @no-binding
   * @default true
   */
  colon?: boolean;

  /**
   * 必填标记
   * @group 基础属性
   * @priority 21
   * @no-binding
   * @default true
   */
  requiredMark?: boolean | 'optional';

  /**
   * 提示配置
   * @group 基础属性
   * @priority 22
   * @no-binding
   */
  tooltip?: object;

  /**
   * 表单名称
   * @group 基础属性
   * @priority 5
   * @no-binding
   */
  name?: string;

  // === 状态 ===

  /**
   * 禁用
   * @group 基础属性
   * @priority 30
   * @no-binding
   */
  disabled?: boolean;

  /**
   * 尺寸
   * @group 基础属性
   * @priority 31
   * @no-binding
   * @enumLabels small:小, middle:居中, large:大
   */
  size?: 'small' | 'middle' | 'large';

  /**
   * 变体
   * @group 基础属性
   * @priority 32
   * @no-binding
   * @enumLabels outlined:描边, borderless:无边框, filled:填充
   */
  variant?: 'outlined' | 'borderless' | 'filled';

  // === 行为 ===

  /**
   * 提交失败自动滚动到首个错误字段
   * @group 高级属性
   * @priority 40
   * @no-binding
   */
  scrollToFirstError?: boolean;

  /**
   * 字段卸载时保留值
   * @group 高级属性
   * @priority 41
   * @no-binding
   */
  preserve?: boolean;

  // === 数据暂存 ===

  /**
   * 启用草稿自动暂存
   * @group 数据暂存
   * @priority 50
   * @no-binding
   * @default false
   */
  draftEnabled?: boolean;

  /**
   * 暂存防抖间隔（毫秒）
   * @group 数据暂存
   * @priority 51
   * @no-binding
   * @default 2000
   */
  draftDebounceMs?: number;

  /**
   * 初始化时恢复未提交的本地草稿
   *
   * 仅在表单没有业务数据/流程快照数据时生效，
   * 避免草稿覆盖真实业务数据。
   *
   * @group 数据暂存
   * @priority 52
   * @no-binding
   * @default false
   */
  draftRestoreOnInit?: boolean;

  // === 校验 ===

  /**
   * 跨字段校验规则
   *
   * 由专用编辑器配置；antd 的 Form.Item rules 只能表达单字段约束，
   * 跨字段规则在提交时由 ValidationEngine 的 Level 3 求值，
   * 错误挂到 targetField 上回写 antd。
   *
   * @group 校验配置
   * @priority 60
   * @no-binding
   */
  crossFieldRules?: object[];

  /**
   * 服务端校验接口地址
   *
   * 提交时 POST 当前表单值到该地址，响应中的 `data.errors` 或 `errors`
   * 会被解析为字段级错误（Level 4 校验）。
   *
   * @group 校验配置
   * @priority 61
   * @no-binding
   */
  validationApi?: string;
}
