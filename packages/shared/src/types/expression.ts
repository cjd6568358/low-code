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
