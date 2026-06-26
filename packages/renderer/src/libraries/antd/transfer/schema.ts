/**
 * 穿梭框 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 穿梭框 组件属性 */
export interface TransferProps extends BaseProps {
  /**
   * 数据源
   * @group 基础属性
   * @priority 10

   */
  dataSource?: any[];

  /**
   * 标题
   * @group 基础属性
   * @priority 11

   */
  titles?: [string, string];

  /**
   * 目标列表
   * @group 基础属性
   * @priority 12

   */
  targetKeys?: string[];

  /**
   * 选中项
   * @group 基础属性
   * @priority 13

   */
  selectedKeys?: string[];

  /**
   * 可搜索
   * @group 基础属性
   * @priority 14

   */
  showSearch?: boolean;

  /**
   * 禁用
   * @group 基础属性
   * @priority 15

   */
  disabled?: boolean;

  /**
   * 单向
   * @group 高级属性
   * @priority 20

   */
  oneWay?: boolean;

  /**
   * 显示全选勾选框
   * @group 高级属性
   * @priority 21
   * @default true

   */
  showSelectAll?: boolean;

  /**
   * 分页配置，可设为 true 使用默认分页
   * @group 高级属性
   * @priority 22

   */
  pagination?: boolean | {
    /** 每页条数 */
    pageSize?: number;
    /** 是否使用简单分页 */
    simple?: boolean;
    /** 是否显示分页大小切换器 */
    showSizeChanger?: boolean;
    /** 是否显示较少页面 */
    showLessItems?: boolean;
  };

  /**
   * 校验状态
   * @group 高级属性
   * @priority 23
   * @enumLabels warning:警告, error:错误, :无, success:成功, validating:校验中
   */
  status?: 'warning' | 'error' | '' | 'success' | 'validating';
}
