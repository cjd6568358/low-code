/** 字典项 */
export interface DictItem {
  label: string;
  value: string | number;
  color?: string;
  icon?: string;
  children?: DictItem[];
  disabled?: boolean;
  extra?: Record<string, any>;
}

/** 字典服务接口 */
export interface DictionaryService {
  getDictValues(dictCode: string): Promise<DictItem[]>;
  getDictValuesSync(dictCode: string): DictItem[] | null;
  preload(dictCodes: string[]): Promise<void>;
  onDictChange(dictCode: string, callback: (items: DictItem[]) => void): () => void;
}

/**
 * 同步表达式求值器（最小接口）
 *
 * 只需要同步求值能力的模块（如跨字段校验 Level 3）依赖此窄接口，
 * 避免耦合到 `DefaultExpressionEngine` 具体类，也便于测试注入替身。
 */
export interface SyncExpressionEvaluator {
  /**
   * 同步安全求值
   *
   * @param expression 表达式内容
   * @param context 上下文变量
   * @returns 求值结果
   */
  safeEvaluateSync(expression: string, context: Record<string, unknown>): unknown;
}
