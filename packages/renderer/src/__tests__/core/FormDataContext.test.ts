/**
 * FormDataContext 草稿暂存测试用例
 *
 * 验证草稿的写入、恢复、清除与「不覆盖业务数据」的安全约束。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FormDataContextManager } from '../../core/FormDataContext.js';
import { LinkageEngine } from '../../core/LinkageEngine.js';
import type { DefaultExpressionEngine } from '@low-code/shared';

/** 创建测试用表达式引擎桩 */
function createExpressionEngineStub(): DefaultExpressionEngine {
  return {
    evaluate: vi.fn(),
    validate: vi.fn().mockReturnValue({ valid: true, errors: [] }),
    analyzeDependencies: vi.fn().mockReturnValue([]),
    safeEvaluate: vi.fn(),
    evaluateAsync: vi.fn(),
    resolveTemplate: vi.fn((template: string) => template),
    resolveTemplateParams: vi.fn((params: Record<string, unknown>) => params),
    safeEvaluateSync: vi.fn(),
  } as unknown as DefaultExpressionEngine;
}

/** 创建受测管理器 */
function createManager(): FormDataContextManager {
  const engine = createExpressionEngineStub();
  return new FormDataContextManager(engine, new LinkageEngine(engine));
}

/**
 * 创建 localStorage 测试替身
 *
 * 本包测试运行在 node 环境（无 DOM），草稿暂存依赖 localStorage，
 * 因此注入一个最小内存实现。
 */
function createLocalStorageStub(): Storage {
  const store = new Map<string, string>();
  return {
    get length(): number {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  };
}

const FORM_ID = 'form_test';

describe('FormDataContextManager 草稿暂存', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageStub(),
      configurable: true,
      writable: true,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('未开启自动暂存时不写入 localStorage', async () => {
    const manager = createManager();
    await manager.init({ formId: FORM_ID, schemaDefaults: {} });

    manager.setValues({ name: '张三' });
    vi.advanceTimersByTime(5000);

    expect(localStorage.getItem(`lc_draft_${FORM_ID}`)).toBeNull();
  });

  it('开启后按防抖间隔写入草稿', async () => {
    const manager = createManager();
    await manager.init({
      formId: FORM_ID,
      schemaDefaults: {},
      draft: { enabled: true, debounceMs: 1000 },
    });

    manager.setValues({ name: '张三' });

    // 防抖未到期：不应写入
    vi.advanceTimersByTime(500);
    expect(localStorage.getItem(`lc_draft_${FORM_ID}`)).toBeNull();

    // 防抖到期：写入
    vi.advanceTimersByTime(600);
    const raw = localStorage.getItem(`lc_draft_${FORM_ID}`);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).values.name).toBe('张三');
  });

  it('flushDraftSave 忽略防抖立即落盘', async () => {
    const manager = createManager();
    await manager.init({
      formId: FORM_ID,
      schemaDefaults: {},
      draft: { enabled: true, debounceMs: 10000 },
    });

    manager.setValues({ name: '李四' });
    expect(localStorage.getItem(`lc_draft_${FORM_ID}`)).toBeNull();

    manager.flushDraftSave();
    expect(JSON.parse(localStorage.getItem(`lc_draft_${FORM_ID}`)!).values.name).toBe('李四');
  });

  it('restoreOnInit 开启时恢复本地草稿', async () => {
    // 预置草稿
    const seed = createManager();
    await seed.init({ formId: FORM_ID, schemaDefaults: {}, draft: { enabled: true } });
    seed.setValues({ name: '王五', age: 30 });
    seed.flushDraftSave();

    // 新实例恢复
    const manager = createManager();
    const result = await manager.init({
      formId: FORM_ID,
      schemaDefaults: { name: '默认值' },
      draft: { enabled: true, restoreOnInit: true },
    });

    expect(result.source).toBe('draft');
    expect(result.values.name).toBe('王五');
    expect(result.values.age).toBe(30);
  });

  it('有业务数据时不恢复草稿（防止覆盖真实数据）', async () => {
    const seed = createManager();
    await seed.init({ formId: FORM_ID, schemaDefaults: {}, draft: { enabled: true } });
    seed.setValues({ name: '草稿值' });
    seed.flushDraftSave();

    const manager = createManager();
    const result = await manager.init({
      formId: FORM_ID,
      schemaDefaults: {},
      businessData: { name: '业务值' },
      draft: { enabled: true, restoreOnInit: true },
    });

    expect(result.source).toBe('edit');
    expect(result.values.name).toBe('业务值');
  });

  it('有流程快照数据时不恢复草稿', async () => {
    const seed = createManager();
    await seed.init({ formId: FORM_ID, schemaDefaults: {}, draft: { enabled: true } });
    seed.setValues({ name: '草稿值' });
    seed.flushDraftSave();

    const manager = createManager();
    const result = await manager.init({
      formId: FORM_ID,
      schemaDefaults: {},
      snapshotData: { name: '快照值' },
      draft: { enabled: true, restoreOnInit: true },
    });

    expect(result.source).toBe('snapshot');
    expect(result.values.name).toBe('快照值');
  });

  it('restoreOnInit 关闭时不读取本地草稿', async () => {
    const seed = createManager();
    await seed.init({ formId: FORM_ID, schemaDefaults: {}, draft: { enabled: true } });
    seed.setValues({ name: '草稿值' });
    seed.flushDraftSave();

    const manager = createManager();
    const result = await manager.init({
      formId: FORM_ID,
      schemaDefaults: { name: '默认值' },
      draft: { enabled: true },
    });

    expect(result.source).toBe('schema');
    expect(result.values.name).toBe('默认值');
  });

  it('clearLocalDraft 清除草稿', async () => {
    const manager = createManager();
    await manager.init({ formId: FORM_ID, schemaDefaults: {}, draft: { enabled: true } });
    manager.setValues({ name: '待清除' });
    manager.flushDraftSave();

    expect(manager.hasLocalDraft()).toBe(true);
    manager.clearLocalDraft();
    expect(manager.hasLocalDraft()).toBe(false);
  });

  it('dispose 清理待触发的防抖定时器', async () => {
    const manager = createManager();
    await manager.init({
      formId: FORM_ID,
      schemaDefaults: {},
      draft: { enabled: true, debounceMs: 1000 },
    });

    manager.setValues({ name: '不会落盘' });
    manager.dispose();

    vi.advanceTimersByTime(5000);
    expect(localStorage.getItem(`lc_draft_${FORM_ID}`)).toBeNull();
  });
});
