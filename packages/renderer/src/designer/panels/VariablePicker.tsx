/**
 * VariablePicker — 变量选择器
 *
 * 根据 mode prop 决定展示内容：
 * - mode="variable"：变量引用模式（变量树选择）
 * - mode="expression"：表达式模式（Monaco 编辑器）
 *
 * 由调用方（AutoFormRenderer）决定展示哪种模式
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { environmentRegistry, type VariableTreeNode } from '../../core/EnvironmentRegistry';
import { MonacoEditor } from '../../components/MonacoEditor';
import type { CompletionItem, MonacoEditorRef } from '../../components/MonacoEditor';
import {
  inferExpressionType,
  isTypeCompatible,
  getTypeMismatchMessage,
  logAnyTypeWarnings,
  resolveVariableType,
  type BaseType,
  type TypeInferResult,
} from '../../core/expression-type-infer';
import { TypeMismatchModal } from './TypeMismatchModal';

// ─── 类型 ─────────────────────────────────────────────

/** 变量模式 */
type VariableMode = 'variable' | 'expression';

/** 类型不匹配对话框状态 */
interface MismatchState {
  visible: boolean;
  expectedType: string;
  actualType: string;
  message: string;
  hasPromiseReturn: boolean;
  promiseLocations: string[];
}

/** 变量选择器属性 */
export interface VariablePickerProps {
  visible: boolean;
  value?: unknown;
  /** 变量模式（由调用方决定，不提供 tab 切换） */
  mode: VariableMode;
  onChange: (value: { type: 'variable' | 'expression'; value: string }) => void;
  onClear: () => void;
  onClose: () => void;
  /** 页面组件列表（用于 $component 代码提示） */
  pageComponents?: Record<string, { type: string; label?: string }>;
  /** 页面数据源列表（用于 $data 代码提示） */
  pageDataSources?: Record<string, { type: string; description?: string }>;
  /** 属性期望的类型（用于类型校验） */
  expectedType?: string;
}

// ─── 纯工具函数 ────────────────────────────────────────

/** 类型中文名称映射 */
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

/** 获取类型的中文显示名称 */
function getTypeDisplayName(type: string): string {
  return TYPE_DISPLAY_NAMES[type] || type;
}

/** 从 value 中提取字符串值（支持对象格式和字符串格式） */
function extractStringValue(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object' && 'value' in val) return (val as { value: string }).value;
  return '';
}

// ─── 样式常量 ──────────────────────────────────────────

/** 遮罩层 */
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

/** 弹窗容器 */
const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: '8px',
  padding: '24px',
  width: '820px',
  maxHeight: '90vh',
  overflow: 'auto',
};

/** 搜索框 */
const searchInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 12px',
  border: '1px solid #d9d9d9',
  borderRadius: '4px',
  marginBottom: '12px',
  boxSizing: 'border-box',
};

/** 变量树容器 */
const treeContainerStyle: React.CSSProperties = {
  border: '1px solid #e8e8e8',
  borderRadius: '4px',
  maxHeight: '240px',
  overflow: 'auto',
  padding: '8px',
};

/** 已选变量容器 */
const selectedVarStyle: React.CSSProperties = {
  marginTop: '8px',
  padding: '8px 12px',
  backgroundColor: '#e6f7ff',
  borderRadius: '4px',
  fontSize: '13px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

/** 清除选择按钮 */
const clearBtnStyle: React.CSSProperties = {
  padding: '2px 8px',
  border: '1px solid #ff4d4f',
  borderRadius: '2px',
  backgroundColor: '#fff',
  color: '#ff4d4f',
  cursor: 'pointer',
  fontSize: '12px',
};

/** 类型信息行 */
const typeInfoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '4px',
  fontSize: '12px',
};

/** 类型标签前缀 */
const typeLabelStyle: React.CSSProperties = {
  color: '#666',
  minWidth: '80px',
};

/** 基础类型标签（共享属性） */
const baseTypeTagStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '4px',
  fontFamily: 'monospace',
  fontSize: '12px',
  fontWeight: 500,
};

/** 期望类型标签 */
const expectedTypeTagStyle: React.CSSProperties = {
  ...baseTypeTagStyle,
  backgroundColor: '#e6f7ff',
  color: '#1890ff',
};

/** 兼容类型标签 */
const compatibleTypeTagStyle: React.CSSProperties = {
  ...baseTypeTagStyle,
  backgroundColor: '#f6ffed',
  color: '#52c41a',
};

/** 不兼容类型标签 */
const incompatibleTypeTagStyle: React.CSSProperties = {
  ...baseTypeTagStyle,
  backgroundColor: '#fff7e6',
  color: '#fa8c16',
};

/** 基础提示框样式 */
const baseAlertStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '4px',
  fontSize: '12px',
};

/** 类型警告样式 */
const typeWarningStyle: React.CSSProperties = {
  ...baseAlertStyle,
  backgroundColor: '#fff7e6',
  border: '1px solid #ffd591',
  color: '#fa8c16',
};

/** 类型错误样式 */
const typeErrorStyle: React.CSSProperties = {
  ...baseAlertStyle,
  backgroundColor: '#fff2f0',
  border: '1px solid #ffccc7',
  color: '#ff4d4f',
};

/** 操作栏容器 */
const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '24px',
};

/** 清除绑定按钮 */
const clearBindingBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: '1px solid #ff4d4f',
  borderRadius: '4px',
  cursor: 'pointer',
  backgroundColor: '#fff',
  color: '#ff4d4f',
  fontSize: '13px',
};

/** 取消按钮 */
const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 24px',
  border: '1px solid #d9d9d9',
  borderRadius: '4px',
  cursor: 'pointer',
  backgroundColor: '#fff',
};

/** 确定按钮 */
const confirmBtnStyle: React.CSSProperties = {
  padding: '8px 24px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  backgroundColor: '#1890ff',
  color: '#fff',
};

/** 返回类型选择器容器 */
const returnTypeSelectorStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '12px',
  color: '#666',
};

/** 返回类型下拉框 */
const returnTypeSelectStyle: React.CSSProperties = {
  padding: '4px 8px',
  border: '1px solid #d9d9d9',
  borderRadius: '4px',
  fontSize: '12px',
  backgroundColor: '#fff',
};

// ─── 子组件 ────────────────────────────────────────────

/** 类型标签组件 */
function TypeBadge({ type, style }: { type: string; style: React.CSSProperties }) {
  return <span style={style}>{getTypeDisplayName(type)}</span>;
}

/** 类型信息行组件 */
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
    <div>
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

// ─── 变量树节点组件 ────────────────────────────────────

/** 变量树节点组件 */
function VariableTreeNodeComponent({
  node,
  onSelect,
  selectedKey,
}: {
  node: VariableTreeNode;
  onSelect: (key: string) => void;
  selectedKey: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children.length > 0;

  return (
    <div style={{ paddingLeft: '8px' }}>
      <div
        onClick={() => {
          if (hasChildren) {
            setExpanded(!expanded);
          } else {
            onSelect(node.key);
          }
        }}
        style={{
          padding: '4px 8px',
          cursor: 'pointer',
          borderRadius: '3px',
          backgroundColor: selectedKey === node.key ? '#e6f7ff' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '13px',
        }}
      >
        {hasChildren && (
          <span style={{ fontSize: '10px', width: '12px' }}>
            {expanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span style={{ width: '12px' }} />}
        <span style={{ fontFamily: 'monospace', color: '#1890ff' }}>{node.label}</span>
        {node.isCrossApp && node.appName && (
          <span
            style={{
              fontSize: '10px',
              color: '#fa8c16',
              backgroundColor: '#fff7e6',
              padding: '1px 4px',
              borderRadius: '2px',
              border: '1px solid #ffd591',
            }}
          >
            {node.appName}
          </span>
        )}
        <span style={{ color: '#999', fontSize: '11px', marginLeft: '4px' }}>
          {node.description}
        </span>
      </div>
      {expanded && hasChildren && (
        <div style={{ paddingLeft: '12px' }}>
          {node.children.map((child) => (
            <VariableTreeNodeComponent
              key={child.key}
              node={child}
              onSelect={onSelect}
              selectedKey={selectedKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 主组件 ────────────────────────────────────────────

/**
 * 变量选择器组件
 */
export function VariablePicker(props: VariablePickerProps) {
  const {
    visible,
    value = '',
    mode,
    onChange,
    onClear,
    onClose,
    pageComponents = {},
    pageDataSources = {},
    expectedType,
  } = props;

  // ─── 状态 ─────────────────────────────────────────────

  const [inputValue, setInputValue] = useState(() => extractStringValue(value));
  const [searchKeyword, setSearchKeyword] = useState('');
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [manualReturnType, setManualReturnType] = useState<BaseType | null>(null);
  const [mismatchInfo, setMismatchInfo] = useState<MismatchState | null>(null);
  const [inferredType, setInferredType] = useState<BaseType | null>(null);
  const [inferResult, setInferResult] = useState<TypeInferResult | null>(null);

  // ─── Refs ─────────────────────────────────────────────

  const editorRef = useRef<MonacoEditorRef>(null);
  const inferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageComponentsRef = useRef(pageComponents);
  const pageDataSourcesRef = useRef(pageDataSources);
  pageComponentsRef.current = pageComponents;
  pageDataSourcesRef.current = pageDataSources;

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
      if (mode === 'variable') {
        const { type, warnings } = resolveVariableType(inputValue);
        setInferredType(type);
        setInferResult({ type, hasPromiseReturn: false, anyWarnings: warnings });
      } else {
        const result = inferExpressionType(inputValue);
        setInferredType(manualReturnType || result.type);
        setInferResult(result);
      }
    }, 300);

    return () => {
      if (inferTimerRef.current) clearTimeout(inferTimerRef.current);
    };
  }, [inputValue, mode, expectedType, manualReturnType]);

  const isCompatible = useMemo(() => {
    if (!expectedType || !inferredType) return true;
    if (inferredType === 'any') return true;
    return isTypeCompatible(expectedType, inferredType);
  }, [expectedType, inferredType]);

  const hasPromise = useMemo(() => inferResult?.hasPromiseReturn ?? false, [inferResult]);

  // ─── 环境变量注册 ─────────────────────────────────────

  useEffect(() => {
    if (!visible) return;
    if (Object.keys(pageComponentsRef.current).length > 0) {
      environmentRegistry.registerPageComponents(pageComponentsRef.current);
    }
    if (Object.keys(pageDataSourcesRef.current).length > 0) {
      environmentRegistry.registerPageDataSources(pageDataSourcesRef.current);
    }
    setRefreshCounter((c) => c + 1);
  }, [visible, pageComponents, pageDataSources]);

  useEffect(() => {
    setInputValue(extractStringValue(value));
  }, [value]);

  // ─── 派生数据 ─────────────────────────────────────────

  const variableTree = useMemo(
    () => environmentRegistry.generateVariableTree(mode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, refreshCounter],
  );

  const filteredTree = useMemo(() => {
    if (!searchKeyword) return variableTree;
    const keyword = searchKeyword.toLowerCase();
    const filterTree = (nodes: VariableTreeNode[]): VariableTreeNode[] =>
      nodes
        .map((node) => {
          const filteredChildren = filterTree(node.children);
          if (
            node.label.toLowerCase().includes(keyword) ||
            node.key.toLowerCase().includes(keyword) ||
            node.description.toLowerCase().includes(keyword) ||
            filteredChildren.length > 0
          ) {
            return { ...node, children: filteredChildren };
          }
          return null;
        })
        .filter(Boolean) as VariableTreeNode[];
    return filterTree(variableTree);
  }, [variableTree, searchKeyword]);

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

  const envVars = useMemo(() => environmentRegistry.getAllDefinitions(mode), [mode]);

  const editorValue = useMemo(() => {
    const envVarsList = envVars.map((def) => ` * ${def.name} — ${def.description}`).join('\n');
    const jsdoc = `/**\n * 可用环境变量：\n${envVarsList}\n *\n * 示例：\n * const name = $user.name;\n * const platform = $platform.web;\n * return name + " - " + platform;\n */\n`;

    if (inputValue) {
      return inputValue.trimStart().startsWith('/**') ? inputValue : jsdoc + inputValue;
    }
    return jsdoc + 'async () => {\n  \n}';
  }, [inputValue, envVars]);

  // ─── 事件处理 ─────────────────────────────────────────

  const handleSelectVariable = useCallback((key: string) => setInputValue(key), []);

  const stripJSDoc = useCallback(
    (code: string): string => code.replace(/^\/\*\*[\s\S]*?\*\/\s*/, ''),
    [],
  );

  const buildSaveValue = useCallback(
    (rawValue: string) => {
      if (mode === 'variable') return { type: 'variable' as const, value: rawValue };
      return { type: 'expression' as const, value: stripJSDoc(rawValue) };
    },
    [mode, stripJSDoc],
  );

  /** 类型校验 */
  const validateType = useCallback(
    (val: string): TypeInferResult | null => {
      if (!expectedType) return null;

      if (mode === 'variable') {
        const { type: varType, warnings } = resolveVariableType(val);
        if (warnings.length > 0) logAnyTypeWarnings(warnings, '变量引用');
        if (varType && varType !== 'any' && !isTypeCompatible(expectedType, varType)) {
          return { type: varType, hasPromiseReturn: false, anyWarnings: warnings };
        }
        return null;
      }

      const result = inferExpressionType(val);
      if (result.anyWarnings?.length) logAnyTypeWarnings(result.anyWarnings, '表达式');
      if (result.hasPromiseReturn) return result;

      const actualType = manualReturnType || result.type;
      if (actualType !== 'any' && !isTypeCompatible(expectedType, actualType)) {
        return { ...result, type: actualType };
      }
      return null;
    },
    [expectedType, mode, manualReturnType],
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
    onChange(buildSaveValue(formattedValue));
    onClose();
  }, [formatExpression, getCodeErrors, validateType, manualReturnType, expectedType, buildSaveValue, onChange, onClose]);

  const handleMismatchContinue = useCallback(async () => {
    setMismatchInfo(null);
    const formattedValue = await formatExpression();
    onChange(buildSaveValue(formattedValue));
    onClose();
  }, [formatExpression, buildSaveValue, onChange, onClose]);

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
      <div style={modalStyle}>
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>
          {mode === 'variable' ? '选择变量' : '编写表达式'}
          {mode === 'variable' && (
            <span style={{ color: '#ff4d4f', fontSize: '12px', marginLeft: '8px' }}>
              (⚠️ 不支持 $table/$computation/$fetch/$workflow)
            </span>
          )}
        </h3>

        {/* ── 变量模式 ── */}
        {mode === 'variable' && (
          <div>
            <input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索变量..."
              style={searchInputStyle}
            />

            <div style={treeContainerStyle}>
              {filteredTree.map((node) => (
                <VariableTreeNodeComponent
                  key={node.key}
                  node={node}
                  onSelect={handleSelectVariable}
                  selectedKey={inputValue}
                />
              ))}
              {filteredTree.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
                  未找到匹配的变量
                </div>
              )}
            </div>

            {inputValue && (
              <div style={selectedVarStyle}>
                <span>
                  已选择: <strong style={{ fontFamily: 'monospace' }}>{inputValue}</strong>
                </span>
                <button onClick={() => setInputValue('')} style={clearBtnStyle}>
                  清除选择
                </button>
              </div>
            )}

            {expectedType && inputValue && (
              <div style={{ marginTop: '12px' }}>
                <TypeInfoRow label="属性期望类型" type={expectedType} style={expectedTypeTagStyle} />
                {inferredType && (
                  <TypeInfoRow
                    label="变量类型"
                    type={inferredType}
                    style={isCompatible ? compatibleTypeTagStyle : incompatibleTypeTagStyle}
                  />
                )}
                {!isCompatible && inputValue.trim() && (
                  <div style={typeWarningStyle}>
                    ⚠️ 类型不匹配：期望 {getTypeDisplayName(expectedType)}，实际 {getTypeDisplayName(inferredType!)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 表达式模式 ── */}
        {mode === 'expression' && (
          <div>
            <MonacoEditor
              ref={editorRef}
              value={editorValue}
              onChange={(val) => setInputValue(stripJSDoc(val))}
              height={600}
              language="javascript"
              theme="dark"
              completionItems={expressionCompletionItems}
            />

            {expectedType && (
              <div style={{ marginTop: '12px', display: 'flex', gap: 8 }}>
                <div>
                  <TypeInfoRow label="属性期望类型" type={expectedType} style={expectedTypeTagStyle} />
                  {inferredType && inputValue.trim() && (
                    <TypeInfoRow
                      label="当前返回类型"
                      type={inferredType}
                      style={isCompatible ? compatibleTypeTagStyle : incompatibleTypeTagStyle}
                    />
                  )}
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
          </div>
        )}

        {/* ── 操作栏 ── */}
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
