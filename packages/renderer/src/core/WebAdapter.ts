import type {
  PlatformAdapter,
  ThemeConfig,
  ApiRequestConfig,
  ApiResponse,
  UploadConfig,
  UploadResult,
} from '@low-code/shared';
import React from 'react';

/**
 * Web 平台适配器
 */
export class WebAdapter implements PlatformAdapter {
  platform = 'web' as const;

  private componentMap = new Map<string, React.ComponentType<any>>();

  resolveComponent(type: string, library: string): React.ComponentType<any> | null {
    const key = `${library}:${type}`;
    return this.componentMap.get(key) || this.componentMap.get(type) || null;
  }

  /** 注册组件到适配器 */
  registerComponent(type: string, component: React.ComponentType<any>, library?: string): void {
    const key = library ? `${library}:${type}` : type;
    this.componentMap.set(key, component);
  }

  applyTheme(theme: ThemeConfig): void {
    // 注入 CSS 变量
    const root = document.documentElement;
    root.style.setProperty('--lc-primary-color', theme.primaryColor);
    root.style.setProperty('--lc-border-radius', `${theme.borderRadius}px`);
    root.style.setProperty('--lc-font-size', `${theme.fontSize}px`);
    root.style.setProperty('--lc-spacing', `${theme.spacing}px`);
    root.style.setProperty('--lc-color-success', theme.colorSuccess);
    root.style.setProperty('--lc-color-warning', theme.colorWarning);
    root.style.setProperty('--lc-color-error', theme.colorError);
    root.style.setProperty('--lc-bg-container', theme.colorBgContainer);
    root.style.setProperty('--lc-text-primary', theme.colorTextPrimary);
  }

  navigate(route: string, params?: Record<string, string>): void {
    let url = route;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }
    // 使用 History API
    window.history.pushState({}, '', url);
    // 触发 popstate 事件让路由系统感知
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  storage = {
    get(key: string): string | null {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key: string, value: string): void {
      try {
        localStorage.setItem(key, value);
      } catch {
        // storage full or disabled
      }
    },
    remove(key: string): void {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    },
  };

  api = {
    async request(config: ApiRequestConfig): Promise<ApiResponse> {
      const { url, method = 'GET', headers = {}, data, params } = config;

      let requestUrl = url;
      if (params) {
        const searchParams = new URLSearchParams(params);
        requestUrl += `?${searchParams.toString()}`;
      }

      const response = await fetch(requestUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      const result = await response.json();
      return {
        code: response.status,
        data: result,
        message: response.statusText,
      };
    },

    async upload(file: File, config: UploadConfig): Promise<UploadResult> {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(config.action || '/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      return {
        url: result.url || result.data?.url || '',
        name: file.name,
        size: file.size,
      };
    },
  };
}

/** 默认 Web 适配器实例 */
export const webAdapter = new WebAdapter();
