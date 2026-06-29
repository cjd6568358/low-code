/**
 * WebAdapter — Web 平台适配器
 *
 * 基于 BaseAdapter 实现 Web 端的平台能力：
 * - 组件解析：通过 componentMap 注册/查找组件
 * - 主题：CSS 变量注入到 document.documentElement
 * - 导航：History API
 * - 存储：localStorage
 * - 网络：fetch API
 */
import type {
  ThemeConfig,
  ApiRequestConfig,
  ApiResponse,
  UploadConfig,
  UploadResult,
} from '@low-code/shared';
import { BaseAdapter } from './adapters/BaseAdapter';

/**
 * Web 平台适配器
 *
 * 继承 BaseAdapter 的组件注册/解析能力，实现 Web 特定的平台功能。
 */
export class WebAdapter extends BaseAdapter {
  readonly platform = 'web' as const;

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

    async upload(file: File | unknown, config: UploadConfig): Promise<UploadResult> {
      const formData = new FormData();
      formData.append('file', file as Blob);

      const response = await fetch(config.action || '/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      return {
        url: result.url || result.data?.url || '',
        name: (file as File).name,
        size: (file as File).size,
      };
    },
  };
}

/** 默认 Web 适配器实例 */
export const webAdapter = new WebAdapter();
