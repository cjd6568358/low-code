import type React from 'react';
import type { ThemeConfig } from './theme';

/**
 * 平台组件通用 Props 契约
 *
 * 适配器以「字符串类型名 → React 组件」的方式注册组件，
 * 组件自身通过 `withPlatform` 等 HOC 注入平台能力，Props 形态各异，
 * 因此统一以开放对象作为契约，避免使用 `any`。
 */
export type PlatformComponentProps = Record<string, unknown>;

/** 平台组件类型（适配器可解析/渲染） */
export type PlatformComponent = React.ComponentType<PlatformComponentProps>;

/**
 * 已包装的平台组件（内部使用）
 *
 * `withPlatform` 返回的组件在运行时接收原始组件 Props 与平台 Props 的并集，
 * 但在适配器边界只保证「接受平台 Props」。`P` 的类型 `unknown` 使其可被
 * 任意已包装组件赋值，无需在调用点使用 `any`。
 */
export type WrappedPlatformComponent = React.ComponentType<
  PlatformComponentProps & Record<string, unknown>
>;

/** 平台适配器接口 */
export interface PlatformAdapter {
  platform: 'web' | 'mobile' | 'miniapp';
  resolveComponent(type: string, library: string): PlatformComponent | null;
  applyTheme(theme: ThemeConfig): void;
  navigate(route: string, params?: Record<string, string>): void;
  /** 存储能力 — 各平台可返回同步或异步结果 */
  storage: {
    get(key: string): string | null | Promise<string | null>;
    set(key: string, value: string): void | Promise<void>;
    remove(key: string): void | Promise<void>;
  };
  api: {
    request(config: ApiRequestConfig): Promise<ApiResponse>;
    upload(file: File | unknown, config: UploadConfig): Promise<UploadResult>;
  };
}

/** API 请求配置 */
export interface ApiRequestConfig {
  /** 请求地址 */
  url: string;
  /** 请求方法（默认 GET） */
  method?: string;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求体 */
  data?: unknown;
  /** 查询参数 */
  params?: Record<string, unknown>;
}

/**
 * API 响应
 *
 * 业务数据形态由调用方决定，因此 `data` 为 `unknown`，
 * 调用方需按已知契约收窄类型。
 */
export interface ApiResponse {
  /** 业务状态码 */
  code: number;
  /** 业务数据 */
  data: unknown;
  /** 提示消息 */
  message?: string;
}

/** 上传配置 */
export interface UploadConfig {
  /** 接受的文件类型 */
  accept?: string;
  /** 最大文件体积（字节） */
  maxSize?: number;
  /** 上传地址 */
  action?: string;
}

/** 上传结果 */
export interface UploadResult {
  /** 文件访问地址 */
  url: string;
  /** 文件名 */
  name: string;
  /** 文件体积（字节） */
  size: number;
}
