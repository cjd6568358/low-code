/**
 * BaseAdapter — 平台适配器基类
 *
 * 抽取所有适配器的公共逻辑：
 * - 组件注册表（componentMap）与组件解析
 * - 抽象方法声明，强制子类实现平台特定逻辑
 */
import type React from 'react';
import type {
  PlatformAdapter,
  ThemeConfig,
  ApiRequestConfig,
  ApiResponse,
  UploadConfig,
  UploadResult,
} from '@low-code/shared';

/**
 * 平台适配器基类
 *
 * 提供组件注册/解析的公共实现，平台差异方法（applyTheme/navigate/storage/api）
 * 由子类实现。
 */
export abstract class BaseAdapter implements PlatformAdapter {
  abstract readonly platform: 'web' | 'mobile' | 'miniapp';

  /** 组件映射表：key 为 `${library}:${type}` 或 `type` */
  protected componentMap = new Map<string, React.ComponentType>();

  /**
   * 解析组件
   * @param type - 组件类型名
   * @param library - 组件库标识
   * @returns 匹配的组件类型，未找到返回 null
   */
  resolveComponent(type: string, library: string): React.ComponentType | null {
    const key = `${library}:${type}`;
    return this.componentMap.get(key) || this.componentMap.get(type) || null;
  }

  /**
   * 注册组件到适配器
   * @param type - 组件类型名
   * @param component - React 组件
   * @param library - 组件库标识（可选）
   */
  registerComponent(type: string, component: React.ComponentType, library?: string): void {
    const key = library ? `${library}:${type}` : type;
    this.componentMap.set(key, component);
  }

  /** 应用主题配置到当前平台 */
  abstract applyTheme(theme: ThemeConfig): void;

  /** 平台路由跳转 */
  abstract navigate(route: string, params?: Record<string, string>): void;

  /** 平台存储能力 — 各平台可返回同步或异步结果 */
  abstract storage: {
    get(key: string): string | null | Promise<string | null>;
    set(key: string, value: string): void | Promise<void>;
    remove(key: string): void | Promise<void>;
  };

  /** 平台网络请求能力 */
  abstract api: {
    request(config: ApiRequestConfig): Promise<ApiResponse>;
    upload(file: File | unknown, config: UploadConfig): Promise<UploadResult>;
  };
}
