import type { DictionaryService as IDictionaryService, DictItem } from '@low-code/shared';
import { getMockDictionary } from '../mock/dictionaries';

/**
 * 字典服务 Mock 实现
 */
export class MockDictionaryService implements IDictionaryService {
  private cache = new Map<string, DictItem[]>();
  private listeners = new Map<string, Set<(items: DictItem[]) => void>>();

  async getDictValues(dictCode: string): Promise<DictItem[]> {
    const cached = this.cache.get(dictCode);
    if (cached) return cached;

    // Mock: 从 mock 数据中获取
    const mockData = getMockDictionary(dictCode);
    if (mockData) {
      this.cache.set(dictCode, mockData);
      return mockData;
    }

    return [];
  }

  getDictValuesSync(dictCode: string): DictItem[] | null {
    return this.cache.get(dictCode) || getMockDictionary(dictCode);
  }

  async preload(dictCodes: string[]): Promise<void> {
    await Promise.all(dictCodes.map((code) => this.getDictValues(code)));
  }

  onDictChange(dictCode: string, callback: (items: DictItem[]) => void): () => void {
    if (!this.listeners.has(dictCode)) {
      this.listeners.set(dictCode, new Set());
    }
    this.listeners.get(dictCode)!.add(callback);

    return () => {
      this.listeners.get(dictCode)?.delete(callback);
    };
  }

  /** 手动更新字典（触发监听器） */
  updateDict(dictCode: string, items: DictItem[]): void {
    this.cache.set(dictCode, items);
    this.listeners.get(dictCode)?.forEach((cb) => cb(items));
  }
}

export const mockDictionaryService = new MockDictionaryService();
