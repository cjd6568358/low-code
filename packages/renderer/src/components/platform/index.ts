/**
 * 平台组件层
 *
 * 提供统一的组件封装能力：
 * - withPlatform HOC：注入平台能力（field/events/linkage）
 * - DesignOverlay：设计态 Portal overlay（选中/工具栏/交互拦截）
 * - types：平台组件类型定义
 */
export { withPlatform } from './withPlatform';
export { DesignOverlay } from './DesignOverlay';
export type {
  PlatformComponentProps,
  DesignInjectedProps,
  FieldBinding,
  LinkageEngine,
  CompiledEventHandler,
  CompiledEventHandlers,
} from './types';
