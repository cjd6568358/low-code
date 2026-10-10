import type { FormDataContext as IFormDataContext } from '@low-code/shared';
import type { CrossFieldRule, CrossFieldValidationResult, SyncExpressionEvaluator } from '@low-code/shared';
import { ValidationEngine, type ValidationResult } from './ValidationEngine';
import { LinkageEngine, type LinkageResult } from './LinkageEngine';

/** 初始值来源（优先级从低到高） */
export type InitialValueSource = 'schema' | 'url' | 'draft' | 'edit' | 'snapshot';

/** 初始值加载结果 */
export interface InitialValueLoadResult {
  values: Record<string, any>;
  source: InitialValueSource;
  meta: Record<string, any>;
}

/** 草稿配置 */
export interface DraftConfig {
  /** 是否启用自动暂存（默认 false，需页面显式开启） */
  enabled?: boolean;
  /** 自动暂存防抖间隔（毫秒，默认 2000） */
  debounceMs?: number;
  /**
   * 是否在初始化时自动恢复本地草稿
   *
   * 默认 false —— 仅当没有业务数据/快照数据时才恢复，
   * 避免草稿覆盖真实业务数据（编辑态数据丢失是严重问题）。
   */
  restoreOnInit?: boolean;
}

/**
 * 表单校验配置
 *
 * 来自 Form 组件的 Schema props，运行时由 `FormRegistry.validateForm` 消费。
 */
export interface FormValidationConfig {
  /** Level 3 跨字段规则（Form props.crossFieldRules） */
  crossFieldRules?: CrossFieldRule[];
  /** Level 4 服务端校验接口地址（Form props.validationApi） */
  validationApi?: string;
  /** Level 4 请求函数（默认使用平台适配器 api.request） */
  apiRequest?: (config: {
    url: string;
    method?: string;
    data?: unknown;
  }) => Promise<unknown>;
}

/** localStorage 草稿 key 前缀 */
const DRAFT_KEY_PREFIX = 'lc_draft_';

/** 默认草稿防抖间隔（毫秒） */
const DEFAULT_DRAFT_DEBOUNCE_MS = 2000;

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
  private expressionEngine: SyncExpressionEvaluator;
  private changeListeners: Set<(values: Record<string, any>) => void> = new Set();
  private draftSaveTimer: ReturnType<typeof setTimeout> | null = null;
  /** 草稿配置 */
  private draftConfig: Required<DraftConfig> = {
    enabled: false,
    debounceMs: DEFAULT_DRAFT_DEBOUNCE_MS,
    restoreOnInit: false,
  };

  /**
   * 联动产出（选项/状态/属性）
   *
   * 与表单字段值分离存储，避免出现在 values/草稿/提交数据中。
   */
  private linkageOutput: {
    options: Record<string, unknown>;
    state: Record<string, unknown>;
    attributes: Record<string, unknown>;
  } = { options: {}, state: {}, attributes: {} };

  /** 表单校验配置（跨字段规则 + 服务端校验），由 Form 组件 mount 时注入 */
  private validationConfig: FormValidationConfig = {};

  constructor(
    expressionEngine: SyncExpressionEvaluator,
    linkageEngine: LinkageEngine,
    validationEngine?: ValidationEngine,
  ) {
    this.expressionEngine = expressionEngine;
    this.linkageEngine = linkageEngine;
    // 缺省自建校验引擎时注入表达式引擎，使跨字段「自定义表达式」校验可用
    this.validationEngine = validationEngine
      || new ValidationEngine(undefined, expressionEngine);

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
   *
   * @param config 初始化配置
   * @returns 初始值加载结果（含最终来源标记）
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
    /** 草稿配置 */
    draft?: DraftConfig;
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
        values[field] = this.expressionEngine.safeEvaluateSync(expr, values);
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

    // 记录草稿配置（formId 就绪后才能读写 localStorage）
    this.draftConfig = {
      enabled: config.draft?.enabled ?? false,
      debounceMs: config.draft?.debounceMs ?? DEFAULT_DRAFT_DEBOUNCE_MS,
      restoreOnInit: config.draft?.restoreOnInit ?? false,
    };

    // 3. Draft 数据
    // 显式传入 draftData 优先；否则在「无业务数据/无快照数据」且开启恢复时读取本地草稿，
    // 避免草稿覆盖真实业务数据（编辑态数据丢失属于严重问题）。
    let draftValues = config.draftData;
    const hasAuthoritativeData = Boolean(config.businessData || config.snapshotData);
    if (!draftValues && this.draftConfig.enabled && this.draftConfig.restoreOnInit && !hasAuthoritativeData) {
      this.context.meta.formId = config.formId;
      // loadDraftFromLocal 返回完整草稿对象（含 values/formId/savedAt），这里只取字段值
      draftValues = this.loadDraftFromLocal()?.values;
    }
    if (draftValues) {
      Object.assign(values, draftValues);
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
    // `InitialValueSource` 是「加载过程」的标记（含 schema/url），
    // 上下文 source 只描述「数据来源」语义，schema/url 归为 'new'。
    const contextSource: IFormDataContext['source'] = config.businessData
      ? 'edit'
      : config.snapshotData
        ? 'snapshot'
        : draftValues
          ? 'draft'
          : 'new';

    this.context = {
      values: { ...values },
      initialValues: { ...values },
      source: contextSource,
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
   *
   * 注意：联动产出（选项/状态/属性）不写入 `values`，
   * 通过 `getLinkageOutput()` 单独获取，避免污染表单数据。
   */
  getContext(): IFormDataContext {
    return { ...this.context, values: { ...this.context.values } };
  }

  /**
   * 获取联动产出快照
   *
   * 三种产出分别对应：选项更新、状态更新（visible/disabled/required）、属性更新。
   * 之前这三类产出以 `__options_{field}` 等伪键写进 `values`，导致：
   * 1. `values` 混入非字段键，提交/暂存/校验时都必须过滤；
   * 2. `Object.keys(values)` 不再等于表单字段集合，草稿内容被污染。
   *
   * @returns 联动产出快照
   */
  getLinkageOutput(): {
    options: Record<string, unknown>;
    state: Record<string, unknown>;
    attributes: Record<string, unknown>;
  } {
    return {
      options: { ...this.linkageOutput.options },
      state: { ...this.linkageOutput.state },
      attributes: { ...this.linkageOutput.attributes },
    };
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
   *
   * @param field 字段名
   * @param fieldSchema 字段 Schema（JSON Schema 约束）
   * @returns 错误消息，通过时返回 null
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
   * Level 3 跨字段校验
   *
   * @param rules 跨字段规则（缺省使用表单配置中的规则）
   * @returns 字段级错误映射
   */
  validateCrossFields(rules?: CrossFieldRule[]): CrossFieldValidationResult {
    const effective = rules ?? this.validationConfig.crossFieldRules ?? [];
    if (effective.length === 0) {
      return { valid: true, errors: {} };
    }
    return this.validationEngine.validateLevel3(this.context.values, effective);
  }

  /**
   * Level 4 服务端校验
   *
   * @param values 提交值（缺省使用当前表单值）
   * @returns 字段级错误映射
   */
  async validateOnServer(values?: Record<string, unknown>): Promise<Record<string, string[]>> {
    const { validationApi, apiRequest } = this.validationConfig;
    if (!validationApi || !apiRequest) return {};

    return this.validationEngine.validateLevel4(
      apiRequest,
      validationApi,
      values ?? this.context.values,
    );
  }

  /**
   * 完整校验（Level 1 ~ 4，提交时执行）
   *
   * @param fields 待校验字段（含各自 Schema）
   * @param options 覆盖校验配置（缺省使用表单配置）
   * @returns 汇总校验结果
   */
  async validate(
    fields: Array<{
      field: string;
      schema: Record<string, any>;
    }>,
    options?: {
      crossFieldRules?: CrossFieldRule[];
      validationApi?: string;
      apiRequest?: (config: {
        url: string;
        method?: string;
        data?: unknown;
      }) => Promise<unknown>;
    },
  ): Promise<ValidationResult> {
    return this.validationEngine.validate(fields, this.context.values, {
      crossFieldRules: options?.crossFieldRules ?? this.validationConfig.crossFieldRules,
      validationApi: options?.validationApi ?? this.validationConfig.validationApi,
      apiRequest: options?.apiRequest ?? this.validationConfig.apiRequest,
    });
  }

  /**
   * 设置校验配置（Form 组件 mount 时调用）
   *
   * @param config 跨字段规则与服务端校验配置
   */
  setValidationConfig(config: FormValidationConfig): void {
    this.validationConfig = { ...config };
  }

  /**
   * 获取当前校验配置
   */
  getValidationConfig(): FormValidationConfig {
    return { ...this.validationConfig };
  }

  /**
   * 导出为可序列化的草稿
   *
   * 过滤 `undefined` 值：`JSON.stringify` 会把它丢弃，导致
   * 「草稿中未出现的字段」与「草稿中显式为空的字段」在恢复时无法区分。
   */
  exportDraft(): Record<string, any> {
    const values: Record<string, any> = {};
    for (const [key, value] of Object.entries(this.context.values)) {
      if (value !== undefined) values[key] = value;
    }
    return {
      formId: this.context.meta.formId,
      values,
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
   *
   * 值更新写回 `values`；选项/状态/属性更新写入 `linkageOutput`，
   * 不污染表单字段集合。
   */
  private applyLinkageResult(result: LinkageResult): void {
    // 值更新
    for (const [field, value] of Object.entries(result.valueUpdates)) {
      this.context.values[field] = value;
    }
    // 状态更新（visible/disabled/required）
    for (const [field, state] of Object.entries(result.stateUpdates)) {
      this.linkageOutput.state[field] = state;
    }
    // 选项更新
    for (const [field, options] of Object.entries(result.optionsUpdates)) {
      this.linkageOutput.options[field] = options;
    }
    // 属性更新
    for (const [field, attrs] of Object.entries(result.attributeUpdates)) {
      this.linkageOutput.attributes[field] = attrs;
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
   *
   * 未开启自动暂存时直接跳过（避免无意义写 localStorage）。
   */
  private scheduleDraftSave(): void {
    if (!this.draftConfig.enabled) return;

    if (this.draftSaveTimer) {
      clearTimeout(this.draftSaveTimer);
    }
    this.draftSaveTimer = setTimeout(() => {
      this.draftSaveTimer = null;
      this.saveDraftToLocal();
    }, this.draftConfig.debounceMs);
  }

  /**
   * 立即保存草稿到 localStorage（忽略防抖）
   *
   * 供表单卸载、页面隐藏等时机调用，避免丢失最后一次编辑。
   */
  flushDraftSave(): void {
    if (!this.draftConfig.enabled) return;
    if (this.draftSaveTimer) {
      clearTimeout(this.draftSaveTimer);
      this.draftSaveTimer = null;
    }
    this.saveDraftToLocal();
  }

  /**
   * 释放资源（清理防抖定时器）
   *
   * 表单卸载时调用，防止定时器在卸载后触发。
   */
  dispose(): void {
    if (this.draftSaveTimer) {
      clearTimeout(this.draftSaveTimer);
      this.draftSaveTimer = null;
    }
    this.changeListeners.clear();
  }

  /**
   * 保存草稿到 localStorage
   */
  private saveDraftToLocal(): void {
    try {
      const draft = this.exportDraft();
      const key = `${DRAFT_KEY_PREFIX}${this.context.meta.formId}`;
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
      const key = `${DRAFT_KEY_PREFIX}${this.context.meta.formId}`;
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
      const key = `${DRAFT_KEY_PREFIX}${this.context.meta.formId}`;
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  /**
   * 是否存在本地草稿
   *
   * 供页面提示「检测到未提交的草稿，是否恢复？」。
   */
  hasLocalDraft(): boolean {
    try {
      const key = `${DRAFT_KEY_PREFIX}${this.context.meta.formId}`;
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  }
}
