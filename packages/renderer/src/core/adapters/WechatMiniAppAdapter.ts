/**
 * WechatMiniAppAdapter — 微信小程序适配器
 *
 * 封装微信小程序原生 API（wx.* 命名空间）：
 * - 导航：wx.navigateTo / wx.redirectTo / wx.switchTab
 * - 存储：wx.getStorageSync / wx.setStorageSync / wx.removeStorageSync
 * - 网络：wx.request / wx.uploadFile
 * - 主题：wx.getSystemInfoSync 获取主题信息
 *
 * 注意：此适配器运行在小程序 JS 环境中，无 DOM/Window 对象。
 * 小程序组件映射通过 registerComponent 注册小程序自定义组件。
 */
import type {
  ThemeConfig,
  ApiRequestConfig,
  ApiResponse,
  UploadConfig,
  UploadResult,
} from '@low-code/shared';
import { BaseAdapter } from './BaseAdapter';

/**
 * 微信小程序全局 API 声明
 *
 * 小程序运行时全局存在 wx 对象，这里仅做类型声明
 */
declare namespace Wx {
  interface NavigateToOptions {
    url: string;
    success?: () => void;
    fail?: (err: { errMsg: string }) => void;
  }

  interface RequestOption {
    url: string;
    method?: string;
    data?: string | Record<string, unknown>;
    header?: Record<string, string>;
    dataType?: string;
    success?: (res: { statusCode: number; data: unknown; header: Record<string, string> }) => void;
    fail?: (err: { errMsg: string }) => void;
    complete?: () => void;
  }

  interface UploadFileOption {
    url: string;
    filePath: string;
    name: string;
    header?: Record<string, string>;
    formData?: Record<string, string>;
    success?: (res: { statusCode: number; data: string }) => void;
    fail?: (err: { errMsg: string }) => void;
  }

  interface SystemInfo {
    brand: string;
    model: string;
    system: string;
    platform: string;
    SDKVersion: string;
    theme?: 'light' | 'dark';
  }
}

/** 小程序全局 wx 对象的类型映射 */
interface WxApi {
  navigateTo(options: Wx.NavigateToOptions): void;
  redirectTo(options: Wx.NavigateToOptions): void;
  switchTab(options: { url: string }): void;
  navigateBack(options?: { delta?: number }): void;
  getStorageSync(key: string): string;
  setStorageSync(key: string, data: string): void;
  removeStorageSync(key: string): void;
  request(options: Wx.RequestOption): void;
  uploadFile(options: Wx.UploadFileOption): void;
  getSystemInfoSync(): Wx.SystemInfo;
}

/** WechatMiniAppAdapter 构造参数 */
export interface WechatMiniAppAdapterConfig {
  /** API 基础路径（可选，自动拼接到请求 URL 前） */
  apiBaseUrl?: string;
  /** 自定义 wx 对象（用于测试注入，默认使用全局 wx） */
  wxApi?: WxApi;
}

/**
 * 微信小程序适配器
 *
 * 直接调用微信小程序原生 API（wx.*），无 DOM 依赖。
 * 适配器构造时可注入自定义 wxApi 用于单元测试。
 */
export class WechatMiniAppAdapter extends BaseAdapter {
  readonly platform = 'miniapp' as const;

  private wx: WxApi;
  private apiBaseUrl: string;

  constructor(config?: WechatMiniAppAdapterConfig) {
    super();
    // 优先使用注入的 wxApi，否则取全局 wx 对象
    this.wx = config?.wxApi ?? (typeof globalThis !== 'undefined' ? (globalThis as Record<string, unknown>).wx as WxApi : undefined!);
    this.apiBaseUrl = config?.apiBaseUrl ?? '';

    if (!this.wx) {
      console.warn('[WechatMiniAppAdapter] wx 对象未找到，请确保在小程序环境中运行或通过配置注入 wxApi');
    }
  }

  applyTheme(theme: ThemeConfig): void {
    // 小程序中无法直接操作 DOM，主题通过 storage 缓存
    // 页面 onShow 时读取并应用到 setData
    try {
      this.wx?.setStorageSync('__lc_theme__', JSON.stringify(theme));
    } catch {
      // storage 写入失败
    }
  }

  /**
   * 获取缓存的主题配置
   *
   * 小程序页面 onShow 时调用此方法读取主题
   */
  getThemeConfig(): ThemeConfig | null {
    try {
      const raw = this.wx?.getStorageSync('__lc_theme__');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  navigate(route: string, params?: Record<string, string>): void {
    let url = route;
    if (params) {
      const query = Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      url += `?${query}`;
    }

    // 根据路由类型选择 API
    // tabBar 页面必须用 switchTab，普通页面用 navigateTo
    if (this.isTabBarRoute(route)) {
      this.wx?.switchTab({ url: route });
    } else {
      this.wx?.navigateTo({ url });
    }
  }

  storage = {
    get: (key: string): string | null => {
      try {
        return this.wx?.getStorageSync(key) ?? null;
      } catch {
        return null;
      }
    },

    set: (key: string, value: string): void => {
      try {
        this.wx?.setStorageSync(key, value);
      } catch {
        // storage 写入失败
      }
    },

    remove: (key: string): void => {
      try {
        this.wx?.removeStorageSync(key);
      } catch {
        // ignore
      }
    },
  };

  api = {
    request: (config: ApiRequestConfig): Promise<ApiResponse> => {
      return new Promise((resolve, reject) => {
        const { url, method = 'GET', headers = {}, data, params } = config;

        let requestUrl = this.apiBaseUrl ? `${this.apiBaseUrl}${url}` : url;
        if (params) {
          const query = Object.entries(params)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
            .join('&');
          requestUrl += `?${query}`;
        }

        this.wx?.request({
          url: requestUrl,
          method: method as string,
          header: {
            'Content-Type': 'application/json',
            ...headers,
          },
          data: data ? JSON.stringify(data) : undefined,
          success: (res) => {
            resolve({
              code: res.statusCode,
              data: res.data,
              message: res.statusCode === 200 ? 'OK' : 'Error',
            });
          },
          fail: (err) => {
            reject(new Error(`wx.request failed: ${err.errMsg}`));
          },
        });
      });
    },

    upload: (file: unknown, config: UploadConfig): Promise<UploadResult> => {
      return new Promise((resolve, reject) => {
        // 小程序中 file 参数为文件临时路径（string）
        const filePath = file as string;
        const actionUrl = this.apiBaseUrl
          ? `${this.apiBaseUrl}${config.action || '/api/upload'}`
          : config.action || '/api/upload';

        this.wx?.uploadFile({
          url: actionUrl,
          filePath,
          name: 'file',
          success: (res) => {
            if (res.statusCode === 200) {
              let result: { url?: string; data?: { url?: string } } = {};
              try {
                result = JSON.parse(res.data);
              } catch {
                // 非 JSON 响应
              }
              resolve({
                url: result.url || result.data?.url || '',
                name: filePath.split('/').pop() || 'file',
                size: 0, // 小程序 uploadFile 不返回文件大小
              });
            } else {
              reject(new Error(`Upload failed with status ${res.statusCode}`));
            }
          },
          fail: (err) => {
            reject(new Error(`wx.uploadFile failed: ${err.errMsg}`));
          },
        });
      });
    },
  };

  /**
   * 获取系统信息
   *
   * 业务层可用于判断设备、主题等
   */
  getSystemInfo(): Wx.SystemInfo | null {
    try {
      return this.wx?.getSystemInfoSync() ?? null;
    } catch {
      return null;
    }
  }

  /**
   * 判断是否为 tabBar 路由
   *
   * 业务层应通过 configureTabBarRoutes() 注册 tabBar 路径
   */
  private tabBarRoutes = new Set<string>();

  /** 配置 tabBar 路由列表 */
  configureTabBarRoutes(routes: string[]): void {
    this.tabBarRoutes = new Set(routes);
  }

  /** 判断路由是否为 tabBar 页面 */
  private isTabBarRoute(route: string): boolean {
    return this.tabBarRoutes.has(route);
  }
}
