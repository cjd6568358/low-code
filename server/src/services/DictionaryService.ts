/**
 * 字典服务
 *
 * 从 JSON 文件加载字典，支持缓存和按需刷新。
 * 存储结构：
 * - 全局字典：data/dictionaries/global/*.json
 * - 租户字典：tenants/{tenantId}/dictionaries/*.json（租户字典覆盖全局同名字典）
 */

import path from 'path';
import { existsAsync, readFile, readdir } from '../utils/fs-utils.js';

/** 字典项 */
export interface DictItem {
  label: string;
  value: string;
  color?: string;
  icon?: string;
  parentId?: string;
  sort?: number;
  disabled?: boolean;
  extra?: Record<string, unknown>;
}

/** 字典定义 */
export interface DictDefinition {
  code: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  items: DictItem[];
}

/** 字典加载结果 */
export interface DictLoadResult {
  success: boolean;
  data?: DictDefinition;
  error?: string;
}

/**
 * 字典服务类
 *
 * 支持全局字典和租户字典，租户字典覆盖全局同名字典。
 */
export class DictionaryService {
  /** 全局字典缓存 */
  private globalCache = new Map<string, DictDefinition>();
  /** 租户字典缓存（key: tenantId） */
  private tenantCaches = new Map<string, Map<string, DictDefinition>>();
  private globalLoaded = false;
  private loading = false;
  private loadPromise: Promise<void> | null = null;

  constructor(
    private readonly dataDir: string,
    private readonly tenantsDir?: string,
  ) {}

  /**
   * 获取全局字典目录路径
   */
  private getGlobalDictDir(): string {
    return path.join(this.dataDir, 'dictionaries', 'global');
  }

  /**
   * 获取租户字典目录路径
   */
  private getTenantDictDir(tenantId: string): string {
    return path.join(this.tenantsDir || '', tenantId, 'dictionaries');
  }

  /**
   * 加载所有全局字典（带缓存）
   */
  async loadAll(): Promise<void> {
    if (this.globalLoaded) {
      return;
    }

    if (this.loading && this.loadPromise) {
      await this.loadPromise;
      return;
    }

    this.loading = true;
    this.loadPromise = this.doLoadGlobal();

    try {
      await this.loadPromise;
      this.globalLoaded = true;
    } finally {
      this.loading = false;
      this.loadPromise = null;
    }
  }

  /**
   * 加载全局字典
   */
  private async doLoadGlobal(): Promise<void> {
    const globalDir = this.getGlobalDictDir();

    if (!await existsAsync(globalDir)) {
      return;
    }

    await this.loadDictsFromDir(globalDir, this.globalCache);
  }

  /**
   * 加载租户字典
   */
  private async loadTenantDicts(tenantId: string): Promise<void> {
    if (this.tenantCaches.has(tenantId)) {
      return;
    }

    const tenantDir = this.getTenantDictDir(tenantId);
    const tenantCache = new Map<string, DictDefinition>();

    if (await existsAsync(tenantDir)) {
      await this.loadDictsFromDir(tenantDir, tenantCache);
    }

    this.tenantCaches.set(tenantId, tenantCache);
  }

  /**
   * 从目录加载字典文件
   */
  private async loadDictsFromDir(dir: string, cache: Map<string, DictDefinition>): Promise<void> {
    const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      try {
        const filePath = path.join(dir, file);
        const content = JSON.parse(await readFile(filePath, 'utf-8'));

        if (content.code && content.name && Array.isArray(content.items)) {
          cache.set(content.code, {
            code: content.code,
            name: content.name,
            description: content.description,
            status: content.status || 'active',
            items: content.items.sort((a: DictItem, b: DictItem) => (a.sort ?? 0) - (b.sort ?? 0)),
          });
        }
      } catch {
        // 跳过损坏的文件
      }
    }
  }

  /**
   * 获取合并后的字典（全局 + 租户覆盖）
   */
  private async getMergedCache(tenantId?: string): Promise<Map<string, DictDefinition>> {
    await this.loadAll();

    if (!tenantId) {
      return this.globalCache;
    }

    await this.loadTenantDicts(tenantId);
    const tenantCache = this.tenantCaches.get(tenantId) || new Map();

    // 合并：租户字典覆盖全局同名字典
    const merged = new Map(this.globalCache);
    for (const [code, dict] of tenantCache) {
      merged.set(code, dict);
    }

    return merged;
  }

  /**
   * 强制刷新缓存
   */
  async refresh(tenantId?: string): Promise<void> {
    if (tenantId) {
      this.tenantCaches.delete(tenantId);
    } else {
      this.globalCache.clear();
      this.globalLoaded = false;
      this.tenantCaches.clear();
    }
  }

  /**
   * 获取所有字典列表（仅元信息，不含字典项）
   */
  async listDicts(tenantId?: string): Promise<Array<Omit<DictDefinition, 'items'>>> {
    const cache = await this.getMergedCache(tenantId);

    return Array.from(cache.values())
      .filter((d) => d.status === 'active')
      .map(({ code, name, description, status }) => ({
        code,
        name,
        description,
        status,
      }));
  }

  /**
   * 获取单个字典（含字典项）
   */
  async getDict(code: string, tenantId?: string): Promise<DictLoadResult> {
    const cache = await this.getMergedCache(tenantId);
    const dict = cache.get(code);

    if (!dict) {
      return {
        success: false,
        error: `字典不存在: ${code}`,
      };
    }

    if (dict.status !== 'active') {
      return {
        success: false,
        error: `字典已停用: ${code}`,
      };
    }

    return {
      success: true,
      data: dict,
    };
  }

  /**
   * 批量获取字典
   */
  async getDicts(codes: string[], tenantId?: string): Promise<Record<string, DictDefinition | null>> {
    const cache = await this.getMergedCache(tenantId);
    const result: Record<string, DictDefinition | null> = {};

    for (const code of codes) {
      const dict = cache.get(code);
      result[code] = dict?.status === 'active' ? dict : null;
    }

    return result;
  }

  /**
   * 搜索字典项（模糊匹配 label）
   */
  async searchItems(code: string, keyword: string, tenantId?: string): Promise<DictItem[]> {
    const { success, data } = await this.getDict(code, tenantId);

    if (!success || !data) {
      return [];
    }

    const lowerKeyword = keyword.toLowerCase();

    return data.items.filter(
      (item) =>
        !item.disabled &&
        (item.label.toLowerCase().includes(lowerKeyword) ||
          item.value.toLowerCase().includes(lowerKeyword)),
    );
  }

  /**
   * 获取字典项（根据 value）
   */
  async getItem(code: string, value: string, tenantId?: string): Promise<DictItem | null> {
    const { success, data } = await this.getDict(code, tenantId);

    if (!success || !data) {
      return null;
    }

    return data.items.find((item) => item.value === value) ?? null;
  }
}
