/**
 * 分隔面板 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 分隔面板 组件属性 */
export interface SplitterProps extends BaseProps {
  /**
   * 布局方向
   * @group 基础属性
   * @priority 10
   * @default "horizontal"
   * @ignore 使用 orientation 代替
   */
  layout?: 'horizontal' | 'vertical';

  /**
   * 布局方向（替代 layout）
   * @group 基础属性
   * @priority 11
   * @default "horizontal"
   * @enumLabels horizontal:水平, vertical:垂直
   */
  orientation?: 'horizontal' | 'vertical';

  /**
   * 是否垂直布局（orientation 的快捷方式）
   * @group 基础属性
   * @priority 12
   */
  vertical?: boolean;

  /**
   * 折叠配置
   * @group 基础属性
   * @priority 13
   */
  collapsible?: {
    /**
     * 是否开启折叠动画
     */
    motion?: boolean;
    /**
     * 折叠图标配置
     */
    icon?: {
      /**
       * 起始方向图标
       */
      start?: string;
      /**
       * 结束方向图标
       */
      end?: string;
    };
  };

  /**
   * 拖拽图标
   * @group 基础属性
   * @priority 30
   */
  draggerIcon?: string;

  /**
   * 懒加载
   * @group 高级属性
   * @priority 40
   */
  lazy?: boolean;

  /**
   * 隐藏时销毁
   * @group 高级属性
   * @priority 41
   */
  destroyOnHidden?: boolean;

  /**
   * 拖拽条双击事件
   * @group 事件
   * @priority 50
   */
  onDraggerDoubleClick?: string;

  /**
   * 开始调整大小事件
   * @group 事件
   * @priority 51
   */
  onResizeStart?: string;

  /**
   * 调整大小事件
   * @group 事件
   * @priority 52
   */
  onResize?: string;

  /**
   * 结束调整大小事件
   * @group 事件
   * @priority 53
   */
  onResizeEnd?: string;

  /**
   * 折叠事件
   * @group 事件
   * @priority 54
   */
  onCollapse?: string;
}
