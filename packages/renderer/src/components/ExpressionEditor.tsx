/**
 * ExpressionEditor — 表达式编辑器
 *
 * 弹窗模式的 Monaco 表达式编辑组件，支持：
 * - 同步/异步函数模式（区别在于 async 标记）
 * - 环境变量按需注入（pageId 或 pageComponents）
 * - 动态 JSDoc 头部（根据注入的环境变量生成）
 * - 实时类型推断与校验
 * - 保存前格式化 + 语法检查
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { environmentRegistry } from '../core/EnvironmentRegistry';
import { MonacoEditor } from './MonacoEditor';
import type { CompletionItem, MonacoEditorRef } from './MonacoEditor';
import {
  inferExpressionType,
  isTypeCompatible,
  getTypeMismatchMessage,
  logAnyTypeWarnings,
  type BaseType,
  type TypeInferResult,
} from '../core/expression-type-infer';
import { TypeMismatchModal } from './TypeMismatchModal';
import { fetchPageComponents, type PageComponentDefinition } from '../utils/page-components';

// ─── 类型 ─────────────────────────────────────────────

/** 类型不匹配对话框状态 */
interface MismatchState {
  visible: boolean;
  expectedType: string;
  actualType: string;
  message: string;
  hasPromiseReturn: boolean;
  promiseLocations: string[];
}

/** 表达式编辑器属性 */
export interface ExpressionEditorProps {
  visible: boolean;
  /** 当前值（字符串或 PropValue 对象） */
  value?: unknown;
  /** 确认回调 — async 标识随 value 一起返回 */
  onChange: (value: { type: 'expression'; value: string; async: boolean }) => void;
  onClear: () => void;
  onClose: () => void;
  /** 同步模式：输出 () => { ... }，异步模式：输出 async () => { ... }（默认 true） */
  async?: boolean;
  /** 页面 ID（用于获取组件定义注入 $component，与 pageComponents 二选一） */
  pageId?: string;
  /** 应用 ID（配合 pageId 使用） */
  appId?: string;
  /** 页面组件列表（未保存页面时由外部传入，与 pageId 二选一） */
  pageComponents?: Record<string, PageComponentDefinition>;
  /** 页面数据源列表 */
  pageDataSources?: Record<string, { type: string; description?: string }>;
  /** 属性期望类型 */
  expectedType?: string;
  /** Monaco 编辑器高度（默认 600） */
  editorHeight?: number;
  /** Monaco 主题（默认 'dark'） */
  editorTheme?: 'light' | 'dark';
  /** 弹窗宽度（默认 820） */
  modalWidth?: number;
  /** 弹窗最大高度（默认 '90vh'） */
  modalMaxHeight?: string;
  /** 仅保存函数体（去掉 async/params 外壳），运行时动态包裹 */
  bodyOnly?: boolean;
}

// ─── 样式常量 ──────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const baseModalStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: '8px',
  padding: '24px',
  overflow: 'auto',
};

const typeInfoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '4px',
  fontSize: '12px',
};

const typeLabelStyle: React.CSSProperties = {
  color: '#666',
  minWidth: '80px',
};

const baseTypeTagStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '4px',
  fontFamily: 'monospace',
  fontSize: '12px',
  fontWeight: 500,
};

const expectedTypeTagStyle: React.CSSProperties = {
  ...baseTypeTagStyle,
  backgroundColor: '#e6f7ff',
  color: '#1890ff',
};

const compatibleTypeTagStyle: React.CSSProperties = {
  ...baseTypeTagStyle,
  backgroundColor: '#f6ffed',
  color: '#52c41a',
};

const incompatibleTypeTagStyle: React.CSSProperties = {
  ...baseTypeTagStyle,
  backgroundColor: '#fff7e6',
  color: '#fa8c16',
};

const baseAlertStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '4px',
  fontSize: '12px',
};

const typeWarningStyle: React.CSSProperties = {
  ...baseAlertStyle,
  backgroundColor: '#fff7e6',
  border: '1px solid #ffd591',
  color: '#fa8c16',
};

const typeErrorStyle: React.CSSProperties = {
  ...baseAlertStyle,
  backgroundColor: '#fff2f0',
  border: '1px solid #ffccc7',
  color: '#ff4d4f',
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '24px',
};

const clearBindingBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: '1px solid #ff4d4f',
  borderRadius: '4px',
  cursor: 'pointer',
  backgroundColor: '#fff',
  color: '#ff4d4f',
  fontSize: '13px',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 24px',
  border: '1px solid #d9d9d9',
  borderRadius: '4px',
  cursor: 'pointer',
  backgroundColor: '#fff',
};

const confirmBtnStyle: React.CSSProperties = {
  padding: '8px 24px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  backgroundColor: '#1890ff',
  color: '#fff',
};

const returnTypeSelectorStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '12px',
  color: '#666',
};

const returnTypeSelectStyle: React.CSSProperties = {
  padding: '4px 8px',
  border: '1px solid #d9d9d9',
  borderRadius: '4px',
  fontSize: '12px',
  backgroundColor: '#fff',
};

// ─── 工具函数 ──────────────────────────────────────────

const TYPE_DISPLAY_NAMES: Record<string, string> = {
  string: '字符串 (string)',
  number: '数字 (number)',
  boolean: '布尔值 (boolean)',
  object: '对象 (object)',
  array: '数组 (array)',
  null: 'null',
  undefined: 'undefined',
  any: '任意类型',
  integer: '整数 (integer)',
};

function getTypeDisplayName(type: string): string {
  return TYPE_DISPLAY_NAMES[type] || type;
}

/** 从 value 中提取字符串值 */
function extractStringValue(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object' && 'value' in val) return (val as { value: string }).value;
  return '';
}

// ─── 子组件 ────────────────────────────────────────────

function TypeBadge({ type, style }: { type: string; style: React.CSSProperties }) {
  return <span style={style}>{getTypeDisplayName(type)}</span>;
}

function TypeInfoRow({ label, type, style }: { label: string; type: string; style: React.CSSProperties }) {
  return (
    <div style={typeInfoStyle}>
      <span style={typeLabelStyle}>{label}</span>
      <TypeBadge type={type} style={style} />
    </div>
  );
}

/** 返回类型手动选择器 */
function ReturnTypeSelector({
  value,
  onChange,
}: {
  value: BaseType | null;
  onChange: (type: BaseType | null) => void;
}) {
  return (
    <div style={{ flexShrink: 0 }}>
      <label style={returnTypeSelectorStyle}>
        <span>返回类型（可选，用于复杂表达式）：</span>
        <select
          value={value || ''}
          onChange={(e) => onChange((e.target.value as BaseType) || null)}
          style={returnTypeSelectStyle}
        >
          <option value="">自动推断</option>
          <option value="string">字符串</option>
          <option value="number">数字</option>
          <option value="boolean">布尔值</option>
          <option value="object">对象</option>
          <option value="array">数组</option>
        </select>
      </label>
      <div style={{ marginTop: '4px', fontSize: '11px', color: '#999' }}>
        简单表达式会自动推断类型，复杂表达式可手动指定
      </div>
    </div>
  );
}

// ─── 主组件 ────────────────────────────────────────────

/**
 * 表达式编辑器
 *
 * 弹窗模式，基于 Monaco Editor 的表达式编辑组件。
 * 输出为函数形式：同步模式 `() => { ... }`，异步模式 `async () => { ... }`。
 */
export function ExpressionEditor(props: ExpressionEditorProps) {
  const {
    visible,
    value = '',
    async: isAsync = true,
    onChange,
    onClear,
    onClose,
    pageId,
    appId,
    pageComponents: externalPageComponents,
    pageDataSources = {},
    expectedType,
    editorHeight = 310,
    editorTheme = 'dark',
    modalWidth = 820,
    modalMaxHeight = '90vh',
    bodyOnly = false,
  } = props;

  // ─── 状态 ─────────────────────────────────────────────

  const [inputValue, setInputValue] = useState(() => extractStringValue(value));
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [manualReturnType, setManualReturnType] = useState<BaseType | null>(null);
  const [mismatchInfo, setMismatchInfo] = useState<MismatchState | null>(null);
  const [inferredType, setInferredType] = useState<BaseType | null>(null);
  const [inferResult, setInferResult] = useState<TypeInferResult | null>(null);
  const [resolvedPageComponents, setResolvedPageComponents] = useState<
    Record<string, PageComponentDefinition> | undefined
  >(undefined);

  // ─── Refs ─────────────────────────────────────────────

  const editorRef = useRef<MonacoEditorRef>(null);
  const inferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageDataSourcesRef = useRef(pageDataSources);
  pageDataSourcesRef.current = pageDataSources;

  // ─── 从 pageId 获取组件定义 ───────────────────────────

  useEffect(() => {
    if (!visible) return;
    if (externalPageComponents) {
      setResolvedPageComponents(externalPageComponents);
      return;
    }
    if (pageId && appId) {
      let cancelled = false;
      (async () => {
        const defs = await fetchPageComponents(appId, pageId);
        if (!cancelled) setResolvedPageComponents(defs);
      })();
      return () => { cancelled = true; };
    }
    setResolvedPageComponents(undefined);
  }, [visible, pageId, appId, externalPageComponents]);

  // ─── 环境变量注册 ─────────────────────────────────────

  useEffect(() => {
    if (!visible) return;
    if (resolvedPageComponents && Object.keys(resolvedPageComponents).length > 0) {
      environmentRegistry.registerPageComponents(resolvedPageComponents);
    }
    if (Object.keys(pageDataSourcesRef.current).length > 0) {
      environmentRegistry.registerPageDataSources(pageDataSourcesRef.current);
    }
    setRefreshCounter((c) => c + 1);
  }, [visible, resolvedPageComponents, pageDataSources]);

  useEffect(() => {
    setInputValue(extractStringValue(value));
  }, [value]);

  // ─── Monaco 操作 ──────────────────────────────────────

  /** 格式化表达式（Monaco 内置格式化） */
  const formatExpression = useCallback(async (): Promise<string> => {
    if (!editorRef.current) return inputValue;
    return await editorRef.current.getFormattedValue();
  }, [inputValue]);

  /** 获取语法错误列表 */
  const getCodeErrors = useCallback((): string[] => {
    if (!editorRef.current) return [];
    return editorRef.current
      .getDiagnostics()
      .filter((d) => d.severity === 'error')
      .map((d) => `第 ${d.lineNumber} 行: ${d.message}`);
  }, []);

  // ─── 实时类型推断 ─────────────────────────────────────

  useEffect(() => {
    if (inferTimerRef.current) clearTimeout(inferTimerRef.current);

    if (!expectedType || !inputValue.trim()) {
      setInferredType(null);
      setInferResult(null);
      return;
    }

    inferTimerRef.current = setTimeout(() => {
      const result = inferExpressionType(inputValue);
      setInferredType(manualReturnType || result.type);
      setInferResult(result);
    }, 300);

    return () => {
      if (inferTimerRef.current) clearTimeout(inferTimerRef.current);
    };
  }, [inputValue, expectedType, manualReturnType]);

  const isCompatible = useMemo(() => {
    if (!expectedType || !inferredType) return true;
    if (inferredType === 'any') return true;
    return isTypeCompatible(expectedType, inferredType);
  }, [expectedType, inferredType]);

  const hasPromise = useMemo(() => inferResult?.hasPromiseReturn ?? false, [inferResult]);

  // ─── 派生数据 ─────────────────────────────────────────

  const expressionCompletionItems = useMemo((): CompletionItem[] => {
    const completions = environmentRegistry.generateMonacoCompletions('expression');
    return completions.map((item) => ({
      label: item.label,
      kind: item.kind,
      detail: item.detail,
      documentation: item.documentation,
      insertText: item.insertText,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshCounter]);

  const envVars = useMemo(() => environmentRegistry.getAllDefinitions('expression'), [refreshCounter]);

  /** 动态生成 JSDoc + 函数签名 */
  const editorValue = useMemo(() => {
    const params = envVars.map((def) => def.name).join(', ');
    const fnPrefix = isAsync ? `async ({${params}}) =>` : `({${params}}) =>`;
    const jsdoc = `/**\n * 示例: return $user.name + $route.query\n */\n`;

    if (inputValue) {
      const trimmed = inputValue.trimStart();
      if (trimmed.startsWith('/**')) return inputValue;
      return jsdoc + inputValue;
    }
    return jsdoc + `${fnPrefix} {\n  \n}`;
  }, [inputValue, envVars, isAsync]);

  /** 传给 Monaco 的悬浮提示项 */
  const hoverItems = useMemo(
    () => envVars.map((def) => ({ label: def.name, documentation: def.description })),
    [envVars],
  );

  // ─── 事件处理 ─────────────────────────────────────────

  const stripJSDoc = useCallback(
    (code: string): string => code.replace(/^\/\*\*[\s\S]*?\*\/\s*/, ''),
    [],
  );

  /** 从完整函数表达式中提取函数体（去掉 async/params 外壳） */
  const stripFunctionWrapper = useCallback(
    (code: string): string => {
      const match = code.match(/^(?:async\s+)?\([^)]*\)\s*=>\s*(\{[\s\S]*\})\s*$/);
      return match ? match[1] : code;
    },
    [],
  );

  /** 类型校验 */
  const validateType = useCallback(
    (val: string): TypeInferResult | null => {
      if (!expectedType) return null;

      const result = inferExpressionType(val);
      if (result.anyWarnings?.length) logAnyTypeWarnings(result.anyWarnings, '表达式');
      if (result.hasPromiseReturn) return result;

      const actualType = manualReturnType || result.type;
      if (actualType !== 'any' && !isTypeCompatible(expectedType, actualType)) {
        return { ...result, type: actualType };
      }
      return null;
    },
    [expectedType, manualReturnType],
  );

  /** 确认选择 */
  const handleConfirm = useCallback(async () => {
    // 1. Monaco 格式化
    const formattedValue = await formatExpression();

    // 2. 语法检查
    const errors = getCodeErrors();
    if (errors.length > 0) {
      setMismatchInfo({
        visible: true,
        expectedType: '语法错误',
        actualType: '语法错误',
        message: `代码存在语法错误，请修复后再保存：\n${errors.join('\n')}`,
        hasPromiseReturn: true,
        promiseLocations: errors,
      });
      return;
    }

    // 3. 类型校验
    const validationResult = validateType(formattedValue);
    if (validationResult) {
      const actualType = manualReturnType || validationResult.type;
      setMismatchInfo({
        visible: true,
        expectedType: expectedType || 'any',
        actualType,
        message: getTypeMismatchMessage(expectedType || 'any', actualType),
        hasPromiseReturn: validationResult.hasPromiseReturn,
        promiseLocations: validationResult.promiseLocations || [],
      });
      return;
    }

    // 4. 保存
    const stripped = stripJSDoc(formattedValue);
    const valueToSave = bodyOnly ? stripFunctionWrapper(stripped) : stripped;
    onChange({ type: 'expression', value: valueToSave, async: isAsync });
    onClose();
  }, [formatExpression, getCodeErrors, validateType, manualReturnType, expectedType, stripJSDoc, bodyOnly, onChange, onClose, isAsync]);

  const handleMismatchContinue = useCallback(async () => {
    setMismatchInfo(null);
    const formattedValue = await formatExpression();
    const stripped = stripJSDoc(formattedValue);
    const valueToSave = bodyOnly ? stripFunctionWrapper(stripped) : stripped;
    onChange({ type: 'expression', value: valueToSave, async: isAsync });
    onClose();
  }, [formatExpression, stripJSDoc, stripFunctionWrapper, bodyOnly, onChange, onClose, isAsync]);

  const handleMismatchCancel = useCallback(() => setMismatchInfo(null), []);

  const handleClear = useCallback(() => {
    setInputValue('');
    onClear();
    onClose();
  }, [onClear, onClose]);

  // ─── 渲染 ────────────────────────────────────────────

  if (!visible) return null;

  return (
    <div style={overlayStyle}>
      <div style={{ ...baseModalStyle, width: modalWidth, maxHeight: modalMaxHeight }}>
        <h3 style={{ marginTop: 0, marginBottom: '12px' }}>编写表达式</h3>

        <MonacoEditor
          ref={editorRef}
          value={editorValue}
          onChange={(val) => setInputValue(stripJSDoc(val))}
          height={editorHeight}
          language="javascript"
          theme={editorTheme}
          completionItems={expressionCompletionItems}
          hoverItems={hoverItems}
        />

        {expectedType && (
          <div style={{ marginTop: '12px', display: 'flex', gap: 8 }}>
            <div style={{ flexShrink: 0 }}>
              <TypeInfoRow label="期望返回类型" type={expectedType} style={expectedTypeTagStyle} />
              <TypeInfoRow
                label="当前返回类型"
                type={inferredType ?? 'undefined'}
                style={inferredType && inputValue.trim() ? (isCompatible ? compatibleTypeTagStyle : incompatibleTypeTagStyle) : baseTypeTagStyle}
              />
            </div>

            {!isCompatible && !hasPromise && inputValue.trim() && (
              <div style={typeWarningStyle}>
                ⚠️ 类型不匹配：期望 {getTypeDisplayName(expectedType)}，实际 {getTypeDisplayName(inferredType!)}
              </div>
            )}

            {hasPromise && (
              <div style={typeErrorStyle}>
                ❌ 禁止返回 Promise，属性绑定只支持基本数据类型
                {inferResult?.promiseLocations && inferResult.promiseLocations.length > 0 && (
                  <div style={{ marginTop: '4px', fontSize: '11px' }}>
                    检测到：{inferResult.promiseLocations.join(', ')}
                  </div>
                )}
              </div>
            )}

            <ReturnTypeSelector value={manualReturnType} onChange={setManualReturnType} />
          </div>
        )}

        {/* 操作栏 */}
        <div style={footerStyle}>
          <button onClick={handleClear} style={clearBindingBtnStyle}>
            清除绑定
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} style={cancelBtnStyle}>
              取消
            </button>
            <button onClick={handleConfirm} style={confirmBtnStyle}>
              确定
            </button>
          </div>
        </div>
      </div>

      {mismatchInfo && (
        <TypeMismatchModal
          visible={mismatchInfo.visible}
          expectedType={mismatchInfo.expectedType}
          actualType={mismatchInfo.actualType}
          message={mismatchInfo.message}
          hasPromiseReturn={mismatchInfo.hasPromiseReturn}
          promiseLocations={mismatchInfo.promiseLocations}
          onContinue={handleMismatchContinue}
          onCancel={handleMismatchCancel}
        />
      )}
    </div>
  );
}
