import type { FormDataContext as IFormDataContext } from '@low-code/shared';
import { ValidationEngine } from './ValidationEngine';
import { LinkageEngine, type LinkageResult } from './LinkageEngine';
import type { DefaultExpressionEngine } from '@low-code/computation';

/** 初始值来源（优先级从低到高） */
export type InitialValueSource = 'schema' | 'url' | 'draft' | 'edit' | 'snapshot';

/** 初始值加载结果 */
export interface InitialValueLoadResult {
  values: Record<string, any>;
  source: InitialValueSource;
  meta: Record<string, any>;
}

/**
 * 表单运行时上下文管理器
 * 管理表单值、初始值、校验、联动
 *
 * 初始值加载优先级（文档定义，从低到高）：
 * 1. Schema default / defaultValueExpression
 * 2. URL 参数
 * 3. Draft 数据（localStorage / 服务端）
 * 4. Business 数据（API by recordId）
 * 5. Snapshot 数据（流程审批节点，最高优先级）
 */
export class FormDataContextManager {
  private context: IFormDataContext;
  private validationEngine: ValidationEngine;
  private linkageEngine: LinkageEngine;
  private expressionEngine: DefaultExpressionEngine;
  private changeListeners: Set<(values: Record<string, any>) => void> = new Set();
  private draftSaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    expressionEngine: DefaultExpressionEngine,
    linkageEngine: LinkageEngine,
    validationEngine?: ValidationEngine,
  ) {
    this.expressionEngine = expressionEngine;
    this.linkageEngine = linkageEngine;
    this.validationEngine = validationEngine || new ValidationEngine();

    this.context = {
      values: {},
      initialValues: {},
      source: 'new',
      meta: {
        formId: '',
        loadedAt: Date.now(),
      },
    };
  }

  /**
   * 初始化表单上下文
   */
  async init(config: {
    formId: string;
    schemaDefaults?: Record<string, any>;
    schemaDefaultExpressions?: Record<string, string>;
    urlParams?: Record<string, string>;
    draftData?: Record<string, any>;
    businessData?: Record<string, any>;
    snapshotData?: Record<string, any>;
    recordId?: string;
    draftId?: string;
    snapshotId?: string;
  }): Promise<InitialValueLoadResult> {
    const values: Record<string, any> = {};
    let source: InitialValueSource = 'schema';

    // 1. Schema default（最低优先级）
    if (config.schemaDefaults) {
      Object.assign(values, config.schemaDefaults);
    }
    // Schema defaultValueExpression
    if (config.schemaDefaultExpressions) {
      for (const [field, expr] of Object.entries(config.schemaDefaultExpressions)) {
        values[field] = this.expressionEngine.safeEvaluate(expr, values);
      }
    }

    // 2. URL 参数
    if (config.urlParams) {
      for (const [key, value] of Object.entries(config.urlParams)) {
        if (value !== undefined && value !== '') {
          values[key] = value;
          source = 'url';
        }
      }
    }

    // 3. Draft 数据
    if (config.draftData) {
      Object.assign(values, config.draftData);
      source = 'draft';
    }

    // 4. Business 数据
    if (config.businessData) {
      Object.assign(values, config.businessData);
      source = 'edit';
    }

    // 5. Snapshot 数据（最高优先级）
    if (config.snapshotData) {
      Object.assign(values, config.snapshotData);
      source = 'snapshot';
    }

    // 设置上下文
    this.context = {
      values: { ...values },
      initialValues: { ...values },
      source: config.businessData ? 'edit' : config.snapshotData ? 'snapshot' : config.draftData ? 'draft' : 'new',
      meta: {
        formId: config.formId,
        recordId: config.recordId,
        draftId: config.draftId,
        snapshotId: config.snapshotId,
        loadedAt: Date.now(),
      },
    };

    // 初始化联动
    const linkageResult = this.linkageEngine.initLinkage(values);
    Object.assign(this.context.values, linkageResult.valueUpdates);

    return {
      values: { ...this.context.values },
      source,
      meta: { ...this.context.meta },
    };
  }

  /**
   * 获取当前表单值
   */
  getValues(): Record<string, any> {
    return { ...this.context.values };
  }

  /**
   * 获取单个字段值
   */
  getValue(field: string): any {
    return this.context.values[field];
  }

  /**
   * 获取初始值
   */
  getInitialValues(): Record<string, any> {
    return { ...this.context.initialValues };
  }

  /**
   * 设置单个字段值（触发联动）
   */
  setValue(field: string, value: any, options?: { silent?: boolean }): LinkageResult {
    this.context.values[field] = value;

    // 触发联动
    const linkageResult = this.linkageEngine.onFieldChange(
      field,
      value,
      this.context.values,
      { silent: options?.silent },
    );

    // 应用联动结果
    this.applyLinkageResult(linkageResult);

    // 通知监听器
    if (!options?.silent) {
      this.notifyListeners();
    }

    // 自动保存草稿
    this.scheduleDraftSave();

    return linkageResult;
  }

  /**
   * 批量设置字段值
   */
  setValues(updates: Record<string, any>): void {
    Object.assign(this.context.values, updates);
    this.notifyListeners();
    this.scheduleDraftSave();
  }

  /**
   * 重置字段为初始值
   */
  resetValue(field: string): void {
    this.context.values[field] = this.context.initialValues[field];
    this.notifyListeners();
  }

  /**
   * 重置所有字段为初始值
   */
  resetAll(): void {
    this.context.values = { ...this.context.initialValues };
    this.notifyListeners();
  }

  /**
   * 获取上下文（用于 RenderContext）
   */
  getContext(): IFormDataContext {
    return { ...this.context };
  }

  /**
   * 获取表单元信息
   */
  getMeta(): IFormDataContext['meta'] {
    return { ...this.context.meta };
  }

  /**
   * 注册值变更监听器
   */
  onChange(listener: (values: Record<string, any>) => void): () => void {
    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  /**
   * Level 1 校验（onChange 触发）
   */
  async validateField(
    field: string,
    fieldSchema: Record<string, any>,
  ): Promise<string | null> {
    return this.validationEngine.validateLevel1(
      field,
      this.context.values[field],
      fieldSchema,
      this.context.values,
    );
  }

  /**
   * 完整校验（提交时执行）
   */
  async validate(
    fields: Array<{
      field: string;
      schema: Record<string, any>;
    }>,
    options?: {
      validationApi?: string;
      apiRequest?: (config: any) => Promise<any>;
    },
  ) {
    return this.validationEngine.validate(fields, this.context.values, options);
  }

  /**
   * 导出为可序列化的草稿
   */
  exportDraft(): Record<string, any> {
    return {
      formId: this.context.meta.formId,
      values: { ...this.context.values },
      savedAt: Date.now(),
    };
  }

  /**
   * 从草稿恢复
   */
  importDraft(draft: Record<string, any>): void {
    if (draft.values) {
      this.context.values = { ...draft.values };
      this.notifyListeners();
    }
  }

  /**
   * 应用联动结果
   */
  private applyLinkageResult(result: LinkageResult): void {
    // 值更新
    for (const [field, value] of Object.entries(result.valueUpdates)) {
      this.context.values[field] = value;
    }
    // 状态更新（visible/disabled/required）存储到 meta
    for (const [field, state] of Object.entries(result.stateUpdates)) {
      (this.context as any)[`__state_${field}`] = state;
    }
    // 选项更新存储到 meta
    for (const [field, options] of Object.entries(result.optionsUpdates)) {
      (this.context as any)[`__options_${field}`] = options;
    }
    // 属性更新存储到 meta
    for (const [field, attrs] of Object.entries(result.attributeUpdates)) {
      (this.context as any)[`__attrs_${field}`] = attrs;
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(): void {
    const values = this.getValues();
    for (const listener of this.changeListeners) {
      listener(values);
    }
  }

  /**
   * 调度草稿保存（防抖）
   */
  private scheduleDraftSave(): void {
    if (this.draftSaveTimer) {
      clearTimeout(this.draftSaveTimer);
    }
    this.draftSaveTimer = setTimeout(() => {
      this.saveDraftToLocal();
    }, 2000);
  }

  /**
   * 保存草稿到 localStorage
   */
  private saveDraftToLocal(): void {
    try {
      const draft = this.exportDraft();
      const key = `lc_draft_${this.context.meta.formId}`;
      localStorage.setItem(key, JSON.stringify(draft));
    } catch {
      // storage full or disabled
    }
  }

  /**
   * 从 localStorage 加载草稿
   */
  loadDraftFromLocal(): Record<string, any> | null {
    try {
      const key = `lc_draft_${this.context.meta.formId}`;
      const data = localStorage.getItem(key);
      if (data) return JSON.parse(data);
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * 清除本地草稿
   */
  clearLocalDraft(): void {
    try {
      const key = `lc_draft_${this.context.meta.formId}`;
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}
