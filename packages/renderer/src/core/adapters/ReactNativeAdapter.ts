/**
 * ReactNativeAdapter — React Native 适配器
 *
 * 适配 React Native 环境：
 * - 导航通过注入的 NavigationContainerRef（react-navigation）
 * - 存储使用 AsyncStorage
 * - 网络请求使用 RN 内置 fetch
 * - 主题通过 Appearance API + 事件通知
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
 * React Native 导航接口
 *
 * 由业务层通过 react-navigation 的 NavigationContainerRef 实现
 */
export interface ReactNativeNavigation {
  /** 跳转到指定路由 */
  navigate(name: string, params?: Record<string, string>): void;
  /** 返回上一页 */
  goBack(): void;
  /** 重置路由栈 */
  reset(name: string): void;
}

/**
 * AsyncStorage 接口
 *
 * 抽象 AsyncStorage 能力，避免直接依赖 @react-native-async-storage/async-storage
 * 业务层注入实际实现
 */
export interface AsyncStorageProvider {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * 主题变更通知接口
 *
 * 业务层可通过 Appearance API 或自定义方式实现
 */
export interface ThemeNotifier {
  /** 注册主题变更回调，返回取消注册函数 */
  onThemeChange(callback: (theme: 'light' | 'dark') => void): () => void;
}

/** ReactNativeAdapter 构造参数 */
export interface ReactNativeAdapterConfig {
  /** 导航实现（react-navigation NavigationContainerRef 或兼容对象） */
  navigation: ReactNativeNavigation;
  /** 存储实现（AsyncStorage 或兼容对象） */
  storageProvider: AsyncStorageProvider;
  /** 主题通知器（可选） */
  themeNotifier?: ThemeNotifier;
  /** API 基础路径 */
  apiBaseUrl?: string;
}

/**
 * React Native 适配器
 *
 * 通过构造函数注入平台能力（导航、存储、主题），保持引擎层零依赖。
 * 业务层负责将 react-navigation / AsyncStorage 等实际实现注入。
 */
export class ReactNativeAdapter extends BaseAdapter {
  readonly platform = 'mobile' as const;

  private navigation: ReactNativeNavigation;
  private storageProvider: AsyncStorageProvider;
  private themeNotifier?: ThemeNotifier;
  private apiBaseUrl: string;
  private themeCleanup?: () => void;

  constructor(config: ReactNativeAdapterConfig) {
    super();
    this.navigation = config.navigation;
    this.storageProvider = config.storageProvider;
    this.themeNotifier = config.themeNotifier;
    this.apiBaseUrl = config.apiBaseUrl ?? '';
  }

  applyTheme(theme: ThemeConfig): void {
    // RN 中主题通过 StyleSheet + 全局 Context 传播
    // 这里记录主题配置，业务层可通过 getThemeConfig() 读取
    this.currentTheme = theme;

    // 注册主题变更监听（如果提供了 notifier）
    this.themeCleanup?.();
    if (this.themeNotifier) {
      this.themeCleanup = this.themeNotifier.onThemeChange(() => {
        // 主题变更回调 — 业务层可通过事件总线通知组件树重渲染
      });
    }
  }

  /** 当前主题配置（供业务层读取） */
  private currentTheme?: ThemeConfig;

  /** 获取当前主题配置 */
  getThemeConfig(): ThemeConfig | undefined {
    return this.currentTheme;
  }

  navigate(route: string, params?: Record<string, string>): void {
    this.navigation.navigate(route, params);
  }

  storage = {
    get: async (key: string): Promise<string | null> => {
      try {
        return await this.storageProvider.getItem(key);
      } catch {
        return null;
      }
    },

    set: async (key: string, value: string): Promise<void> => {
      try {
        await this.storageProvider.setItem(key, value);
      } catch {
        // storage 不可用
      }
    },

    remove: async (key: string): Promise<void> => {
      try {
        await this.storageProvider.removeItem(key);
      } catch {
        // ignore
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

    upload: async (file: unknown, config: UploadConfig): Promise<UploadResult> => {
      // RN 中文件上传通常使用 FormData + fetch
      // file 参数应为 { uri: string, type: string, name: string } 格式
      const fileObj = file as { uri: string; type: string; name: string; size?: number };

      const formData = new FormData();
      formData.append('file', fileObj as unknown as Blob);

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
        name: fileObj.name,
        size: fileObj.size ?? 0,
      };
    },
  };

  /** 清理资源（组件卸载时调用） */
  dispose(): void {
    this.themeCleanup?.();
    this.themeCleanup = undefined;
  }
}
