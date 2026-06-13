import type React from 'react';
import type { ThemeConfig } from './theme';

/** 平台适配器接口 */
export interface PlatformAdapter {
  platform: 'web' | 'mobile' | 'miniapp';
  resolveComponent(type: string, library: string): React.ComponentType<any> | null;
  applyTheme(theme: ThemeConfig): void;
  navigate(route: string, params?: Record<string, string>): void;
  storage: {
    get(key: string): string | null;
    set(key: string, value: string): void;
    remove(key: string): void;
  };
  api: {
    request(config: ApiRequestConfig): Promise<ApiResponse>;
    upload(file: File, config: UploadConfig): Promise<UploadResult>;
  };
}

export interface ApiRequestConfig {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  data?: any;
  params?: Record<string, any>;
}

export interface ApiResponse {
  code: number;
  data: any;
  message?: string;
}

export interface UploadConfig {
  accept?: string;
  maxSize?: number;
  action?: string;
}

export interface UploadResult {
  url: string;
  name: string;
  size: number;
}
