/**
 * H5Adapter — H5 移动端 Web 适配器
 *
 * 基于浏览器环境的移动端适配，使用标准 Web API（fetch/localStorage/History），
 * 同时针对移动端特性做适配：
 * - 支持 hash 路由模式（兼容 SPA 移动端常见部署方式）
 * - 主题注入时同步设置 viewport meta 标签
 * - storage 适配 sessionStorage 降级
 */
import type {
  ThemeConfig,
  ApiRequestConfig,
  ApiResponse,
  UploadConfig,
  UploadResult,
} from '@low-code/shared';
import { BaseAdapter } from './BaseAdapter';

/** H5 适配器配置 */
export interface H5AdapterConfig {
  /** 路由模式，默认 'history' */
  routeMode?: 'history' | 'hash';
  /** API 基础路径 */
  apiBaseUrl?: string;
}

/**
 * H5 移动端 Web 适配器
 *
 * 使用标准 Web API，针对移动端场景做了以下适配：
 * - hash/history 双路由模式
 * - viewport meta 自动注入
 * - API 基础路径可配置
 */
export class H5Adapter extends BaseAdapter {
  readonly platform = 'mobile' as const;

  private routeMode: 'history' | 'hash';
  private apiBaseUrl: string;

  constructor(config?: H5AdapterConfig) {
    super();
    this.routeMode = config?.routeMode ?? 'history';
    this.apiBaseUrl = config?.apiBaseUrl ?? '';
  }

  applyTheme(theme: ThemeConfig): void {
    // 确保 viewport meta 标签存在（移动端必须）
    this.ensureViewportMeta();

    // 注入 CSS 变量（与 WebAdapter 一致）
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

    if (this.routeMode === 'hash') {
      // hash 路由模式：`/#/path?query`
      window.location.hash = url;
    } else {
      // History API 模式
      window.history.pushState({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  storage = {
    get: (key: string): string | null => {
      try {
        return localStorage.getItem(key);
      } catch {
        // 隐身模式降级到 sessionStorage
        try {
          return sessionStorage.getItem(key);
        } catch {
          return null;
        }
      }
    },

    set: (key: string, value: string): void => {
      try {
        localStorage.setItem(key, value);
      } catch {
        try {
          sessionStorage.setItem(key, value);
        } catch {
          // storage 不可用
        }
      }
    },

    remove: (key: string): void => {
      try {
        localStorage.removeItem(key);
      } catch {
        try {
          sessionStorage.removeItem(key);
        } catch {
          // ignore
        }
      }
    },
  };

  api = {
    request: async (config: ApiRequestConfig): Promise<ApiResponse> => {
      const { url, method = 'GET', headers = {}, data, params } = config;

      let requestUrl = this.apiBaseUrl ? `${this.apiBaseUrl}${url}` : url;
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

    upload: async (file: File | unknown, config: UploadConfig): Promise<UploadResult> => {
      const formData = new FormData();
      formData.append('file', file as Blob);

      const actionUrl = this.apiBaseUrl
        ? `${this.apiBaseUrl}${config.action || '/api/upload'}`
        : config.action || '/api/upload';

      const response = await fetch(actionUrl, {
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

  /** 确保 viewport meta 标签存在并配置正确 */
  private ensureViewportMeta(): void {
    if (typeof document === 'undefined') return;

    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      document.head.appendChild(viewport);
    }
    viewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
    );
  }
}
