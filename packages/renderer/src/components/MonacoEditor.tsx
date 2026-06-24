/**
 * Monaco 编辑器包装组件
 */

import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as monaco from 'monaco-editor';

/** 代码诊断信息 */
export interface CodeDiagnostic {
  /** 错误级别：error | warning | info */
  severity: 'error' | 'warning' | 'info';
  /** 错误信息 */
  message: string;
  /** 行号 */
  lineNumber: number;
  /** 列号 */
  column: number;
  /** 错误代码 */
  code?: string | number;
}

/** Monaco 编辑器暴露的方法 */
export interface MonacoEditorRef {
  /** 获取编辑器实例 */
  getEditor: () => monaco.editor.IStandaloneCodeEditor | null;
  /** 格式化文档 */
  formatDocument: () => Promise<void>;
  /** 获取格式化后的值 */
  getFormattedValue: () => Promise<string>;
  /** 获取代码诊断信息（语法错误、警告等） */
  getDiagnostics: () => CodeDiagnostic[];
  /** 检查代码是否有错误 */
  hasErrors: () => boolean;
}

/** Monaco 编辑器属性 */
export interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  height?: number;
  language?: string;
  completionItems?: CompletionItem[];
  theme?: 'light' | 'dark';
}

/** 自动补全项 */
export interface CompletionItem {
  label: string;
  kind: 'variable' | 'property' | 'method' | 'keyword';
  detail: string;
  documentation?: string;
  insertText: string;
}

/**
 * Monaco 编辑器包装组件
 */
export const MonacoEditor = forwardRef<MonacoEditorRef, MonacoEditorProps>((props, ref) => {
  const {
    value,
    onChange,
    placeholder = '',
    disabled = false,
    height = 200,
    language = 'javascript',
    completionItems = [],
    theme = 'light',
  } = props;

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const disposablesRef = useRef<monaco.IDisposable[]>([]);
  const completionItemsRef = useRef<CompletionItem[]>(completionItems);

  // 保持 completionItems 引用最新
  completionItemsRef.current = completionItems;

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    /** 获取编辑器实例 */
    getEditor: () => editorRef.current,
    /** 格式化文档 */
    formatDocument: async () => {
      if (!editorRef.current) return;
      await editorRef.current.getAction('editor.action.formatDocument')?.run();
    },
    /** 获取格式化后的值 */
    getFormattedValue: async () => {
      if (!editorRef.current) return '';
      await editorRef.current.getAction('editor.action.formatDocument')?.run();
      return editorRef.current.getValue();
    },
    /** 获取代码诊断信息（语法错误、警告等） */
    getDiagnostics: (): CodeDiagnostic[] => {
      if (!editorRef.current) return [];
      const model = editorRef.current.getModel();
      if (!model) return [];

      // 获取 Monaco 的语法验证标记
      const markers = monaco.editor.getModelMarkers({ resource: model.uri });
      return markers.map(marker => ({
        severity: marker.severity === monaco.MarkerSeverity.Error ? 'error' :
                  marker.severity === monaco.MarkerSeverity.Warning ? 'warning' : 'info',
        message: marker.message,
        lineNumber: marker.startLineNumber,
        column: marker.startColumn,
        code: typeof marker.code === 'object' ? marker.code?.value : marker.code,
      }));
    },
    /** 检查代码是否有错误 */
    hasErrors: (): boolean => {
      if (!editorRef.current) return false;
      const model = editorRef.current.getModel();
      if (!model) return false;

      const markers = monaco.editor.getModelMarkers({ resource: model.uri });
      return markers.some(marker => marker.severity === monaco.MarkerSeverity.Error);
    },
  }), []);

  // 清理资源
  const cleanup = useCallback(() => {
    disposablesRef.current.forEach((d) => d.dispose());
    disposablesRef.current = [];
    editorRef.current?.dispose();
    editorRef.current = null;
  }, []);

  // 初始化编辑器和补全提供器
  useEffect(() => {
    if (!containerRef.current) return;

    // 创建编辑器实例
    const editor = monaco.editor.create(containerRef.current, {
      value,
      language,
      theme: theme === 'dark' ? 'vs-dark' : 'vs',
      minimap: { enabled: false },
      lineNumbers: 'on',
      glyphMargin: false,
      folding: true,
      lineDecorationsWidth: 8,
      lineNumbersMinChars: 3,
      overviewRulerBorder: false,
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
      },
      readOnly: disabled,
      placeholder,
      automaticLayout: true,
      fontSize: 13,
      tabSize: 2,
      wordWrap: 'on',
      // 禁用基于单词的建议，保留触发字符的补全
      wordBasedSuggestions: 'off',
    });

    // 监听值变更
    const changeDisposable = editor.onDidChangeModelContent(() => {
      const newValue = editor.getValue();
      onChange(newValue);
    });

    editorRef.current = editor;
    disposablesRef.current.push(changeDisposable);

    // 注册自动补全提供器
    const completionProvider = monaco.languages.registerCompletionItemProvider(language, {
      triggerCharacters: ['$', '.'],
      provideCompletionItems: (model, position) => {
        // 使用 ref 获取最新的 completionItems
        const currentCompletionItems = completionItemsRef.current;
        if (currentCompletionItems.length === 0) return { suggestions: [] };

        const lineContent = model.getLineContent(position.lineNumber);
        const textBeforeCursor = lineContent.substring(0, position.column - 1);

        // 提取当前正在输入的变量路径
        const varPathMatch = textBeforeCursor.match(/(\$[a-zA-Z_][a-zA-Z0-9_.]*)$/);
        const currentVarPath = varPathMatch ? varPathMatch[1] : '';

        // 判断是否正在输入子属性（如 $platform.）
        const lastDotIndex = currentVarPath.lastIndexOf('.');
        const isTypingSubProperty = lastDotIndex > 0;
        const parentPath = isTypingSubProperty ? currentVarPath.substring(0, lastDotIndex) : '';

        let filteredItems: CompletionItem[];
        let isSubPropertyMode = false;
        let isDollarTrigger = textBeforeCursor.endsWith('$');

        if (isDollarTrigger) {
          // 输入 $：只显示顶级变量
          filteredItems = currentCompletionItems.filter(item => !item.insertText.includes('.'));
        } else if (isTypingSubProperty && currentVarPath.endsWith('.')) {
          // 输入 $platform.：只显示 $platform 的子属性
          isSubPropertyMode = true;
          filteredItems = currentCompletionItems.filter(item => {
            if (!item.insertText.startsWith(parentPath + '.')) return false;
            if (item.insertText === parentPath) return false;
            const subPart = item.insertText.substring(parentPath.length + 1);
            return !subPart.includes('.');
          });
        } else if (currentVarPath.startsWith('$')) {
          // 输入 $plat：过滤匹配的变量
          filteredItems = currentCompletionItems.filter(item => item.insertText.startsWith(currentVarPath));
        } else {
          return { suggestions: [] };
        }

        // 构建 suggestions
        const suggestions: monaco.languages.CompletionItem[] = filteredItems
          .filter(item => {
            // 在子属性模式下，确保不包含父路径本身
            if (isSubPropertyMode) {
              return item.insertText !== parentPath;
            }
            return true;
          })
          .map(item => {
            let displayLabel = item.label;
            let insertText = item.insertText;
            // 默认从光标位置开始插入
            let startColumn = position.column;

            if (isSubPropertyMode) {
              // 子属性模式：只显示子属性名
              const subPart = item.insertText.substring(parentPath.length + 1);
              displayLabel = subPart;
              insertText = subPart;
            } else if (isDollarTrigger) {
              // $ 触发：range 需要覆盖已输入的 $，避免出现 $$
              startColumn = position.column - 1;
            }

            return {
              label: displayLabel,
              kind: getMonacoCompletionKind(item.kind),
              detail: item.detail,
              documentation: item.documentation ? { value: item.documentation } : undefined,
              insertText,
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn,
                endColumn: position.column,
              },
            };
          });

        return { suggestions };
      },
    });

    disposablesRef.current.push(completionProvider);

    return cleanup;
  }, [language, theme, disabled, placeholder]);

  // 外部值变更时同步到编辑器
  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== value) {
      editorRef.current.setValue(value || '');
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: `${height}px`,
        border: '1px solid #d9d9d9',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    />
  );
});

MonacoEditor.displayName = 'MonacoEditor';

/**
 * 获取 Monaco 自动补全类型
 */
function getMonacoCompletionKind(kind: string): monaco.languages.CompletionItemKind {
  const kindMap: Record<string, monaco.languages.CompletionItemKind> = {
    variable: monaco.languages.CompletionItemKind.Variable,
    property: monaco.languages.CompletionItemKind.Property,
    method: monaco.languages.CompletionItemKind.Method,
    keyword: monaco.languages.CompletionItemKind.Keyword,
  };
  return kindMap[kind] || monaco.languages.CompletionItemKind.Text;
}

export default MonacoEditor;
