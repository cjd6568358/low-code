/** 表达式引擎接口 */
export interface ExpressionEngine {
  evaluate(expression: string, context: Record<string, any>): any;
  validate(expression: string): { valid: boolean; errors: string[] };
  analyzeDependencies(expression: string): string[];
  safeEvaluate(expression: string, context: Record<string, any>, timeout?: number): any;
  /** 异步求值，支持 await 表达式（用于数据源等异步场景） */
  evaluateAsync(expression: string, context: Record<string, any>, timeout?: number): Promise<any>;
}

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
