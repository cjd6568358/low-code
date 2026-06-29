/**
 * 多端适配器 barrel exports
 *
 * 提供平台适配器的统一导出入口
 */
export { BaseAdapter } from './BaseAdapter';
export { H5Adapter } from './H5Adapter';
export type { H5AdapterConfig } from './H5Adapter';
export { ReactNativeAdapter } from './ReactNativeAdapter';
export type {
  ReactNativeAdapterConfig,
  ReactNativeNavigation,
  AsyncStorageProvider,
  ThemeNotifier,
} from './ReactNativeAdapter';
export { WechatMiniAppAdapter } from './WechatMiniAppAdapter';
export type { WechatMiniAppAdapterConfig } from './WechatMiniAppAdapter';
