/**
 * VariablePicker — 变量选择器
 *
 * 根据 mode prop 决定展示内容：
 * - mode="variable"：变量引用模式（变量树选择）
 * - mode="expression"：表达式模式（Monaco 编辑器）
 *
 * 由调用方（AutoFormRenderer）决定展示哪种模式
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { environmentRegistry, type VariableTreeNode } from '../../core/EnvironmentRegistry';
import { MonacoEditor } from '../../components/MonacoEditor';
import type { CompletionItem } from '../../components/MonacoEditor';
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

/** 变量模式 */
type VariableMode = 'variable' | 'expression';

/** 变量选择器属性 */
export interface VariablePickerProps {
  visible: boolean;
  value?: any;
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

  // 从 value 中提取实际的字符串值（支持对象格式和字符串格式）
  const extractStringValue = (val: any): string => {
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object' && 'value' in val) return val.value;
    return '';
  };

  const [inputValue, setInputValue] = useState(extractStringValue(value));
  const [searchKeyword, setSearchKeyword] = useState('');
  const [refreshCounter, setRefreshCounter] = useState(0);
  /** 手动声明的返回类型（表达式模式，当自动推断为 any 时使用） */
  const [manualReturnType, setManualReturnType] = useState<BaseType | null>(null);
  /** 类型不匹配确认对话框状态 */
  const [mismatchInfo, setMismatchInfo] = useState<{
    visible: boolean;
    expectedType: string;
    actualType: string;
    message: string;
    hasPromiseReturn: boolean;
    promiseLocations: string[];
  } | null>(null);

  // 用 ref 保存最新的 props 对象引用，避免 effect 依赖对象导致无限循环
  const pageComponentsRef = React.useRef(pageComponents);
  const pageDataSourcesRef = React.useRef(pageDataSources);
  pageComponentsRef.current = pageComponents;
  pageDataSourcesRef.current = pageDataSources;

  // 动态注册页面组件和数据源
  useEffect(() => {
    if (visible) {
      // 注册页面组件到 $component
      if (Object.keys(pageComponentsRef.current).length > 0) {
        environmentRegistry.registerPageComponents(pageComponentsRef.current);
      }
      // 注册页面数据源到 $data
      if (Object.keys(pageDataSourcesRef.current).length > 0) {
        environmentRegistry.registerPageDataSources(pageDataSourcesRef.current);
      }
      // 触发刷新
      setRefreshCounter((c) => c + 1);
    }
  }, [visible, pageComponents, pageDataSources]);

  // 同步外部 value
  useEffect(() => {
    setInputValue(extractStringValue(value));
  }, [value]);

  // 获取变量树（按模式过滤）
  const variableTree = useMemo(() => {
    return environmentRegistry.generateVariableTree(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, refreshCounter]);

  // 过滤变量树
  const filteredTree = useMemo(() => {
    if (!searchKeyword) return variableTree;
    const keyword = searchKeyword.toLowerCase();
    const filterTree = (nodes: VariableTreeNode[]): VariableTreeNode[] => {
      return nodes
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
    };
    return filterTree(variableTree);
  }, [variableTree, searchKeyword]);

  // 表达式模式的自动补全项
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

  // 选择变量
  const handleSelectVariable = useCallback((key: string) => {
    setInputValue(key);
  }, []);

  // 类型校验
  const validateType = useCallback((value: string): TypeInferResult | null => {
    if (!expectedType) return null; // 没有期望类型，跳过校验

    if (mode === 'variable') {
      // 变量模式：解析变量路径类型
      const { type: varType, warnings } = resolveVariableType(value);

      // 输出 any 类型警告
      if (warnings.length > 0) {
        logAnyTypeWarnings(warnings, '变量引用');
      }

      if (varType && varType !== 'any' && !isTypeCompatible(expectedType, varType)) {
        return {
          type: varType,
          hasPromiseReturn: false,
          anyWarnings: warnings,
        };
      }
      return null;
    } else {
      // 表达式模式：推断返回类型
      const result = inferExpressionType(value);

      // 输出 any 类型警告
      if (result.anyWarnings && result.anyWarnings.length > 0) {
        logAnyTypeWarnings(result.anyWarnings, '表达式');
      }

      // 检查 Promise 返回
      if (result.hasPromiseReturn) {
        return result;
      }

      // 使用手动声明的类型（如果有）或自动推断的类型
      const actualType = manualReturnType || result.type;

      // 检查类型兼容性（any 类型跳过校验）
      if (actualType !== 'any' && !isTypeCompatible(expectedType, actualType)) {
        return {
          ...result,
          type: actualType,
        };
      }

      return null;
    }
  }, [expectedType, mode, manualReturnType]);

  // 过滤掉开头的 JSDoc 注释（保存时只保留函数本身）
  const stripJSDoc = useCallback((code: string): string => {
    const jsdocRegex = /^\/\*\*[\s\S]*?\*\/\s*/;
    return code.replace(jsdocRegex, '');
  }, []);

  // 构建保存值（根据模式返回不同格式）
  const buildSaveValue = useCallback((rawValue: string) => {
    if (mode === 'variable') {
      // 变量引用：{ type: 'variable', value: '$user.name' }
      return { type: 'variable' as const, value: rawValue };
    } else {
      // 表达式：{ type: 'expression', value: 'async () => { ... }' }
      const cleanValue = stripJSDoc(rawValue);
      return { type: 'expression' as const, value: cleanValue };
    }
  }, [mode, stripJSDoc]);

  // 确认选择
  const handleConfirm = useCallback(() => {
    // 类型校验
    const validationResult = validateType(inputValue);

    if (validationResult) {
      // 有类型问题，显示确认对话框
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

    // 校验通过，构建保存值并保存
    const saveValue = buildSaveValue(inputValue);
    onChange(saveValue);
    onClose();
  }, [inputValue, onChange, onClose, expectedType, manualReturnType, validateType, buildSaveValue]);

  // 类型不匹配确认后继续
  const handleMismatchContinue = useCallback(() => {
    setMismatchInfo(null);
    onChange(buildSaveValue(inputValue));
    onClose();
  }, [inputValue, onChange, onClose, buildSaveValue]);

  // 类型不匹配取消
  const handleMismatchCancel = useCallback(() => {
    setMismatchInfo(null);
  }, []);

  // 清除
  const handleClear = useCallback(() => {
    setInputValue('');
    onClear();
    onClose();
  }, [onClear, onClose]);

  // 获取环境变量说明列表
  const envVars = environmentRegistry.getAllDefinitions(mode);

  // 生成 JSDoc 注释（环境变量说明 + 示例）
  const generateJSDoc = useCallback((): string => {
    const envVarsList = envVars.map(def => ` * ${def.name} — ${def.description}`).join('\n');
    return `/**\n * 可用环境变量：\n${envVarsList}\n *\n * 示例：\n * const name = $user.name;\n * const platform = $platform.web;\n * return name + " - " + platform;\n */\n`;
  }, [envVars]);

  // 为函数代码添加 JSDoc（打开时回显）
  const addJSDoc = useCallback((code: string): string => {
    // 如果已经有 JSDoc，不重复添加
    if (code.trimStart().startsWith('/**')) {
      return code;
    }
    return generateJSDoc() + code;
  }, [generateJSDoc]);

  // 计算 MonacoEditor 的显示值（添加 JSDoc）
  const editorValue = useMemo(() => {
    if (inputValue) {
      return addJSDoc(inputValue);
    }
    // 默认值：JSDoc + 空函数
    return generateJSDoc() + 'async () => {\n  \n}';
  }, [inputValue, addJSDoc, generateJSDoc]);

  if (!visible) return null;

  return (
    <div
      style={{
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
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '24px',
          width: '820px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>
          {mode === 'variable' ? '选择变量' : '编写表达式'}
          {mode === 'variable' && (
            <span style={{ marginTop: '8px', color: '#ff4d4f' }}>
              (⚠️ 不支持 $table/$computation/$fetch/$workflow)
            </span>
          )}
        </h3>

        {/* 变量引用模式 */}
        {mode === 'variable' && (
          <div>

            {/* 搜索 */}
            <input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索变量..."
              style={{
                width: '100%',
                padding: '6px 12px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                marginBottom: '12px',
                boxSizing: 'border-box',
              }}
            />

            {/* 变量树 */}
            <div
              style={{
                border: '1px solid #e8e8e8',
                borderRadius: '4px',
                maxHeight: '240px',
                overflow: 'auto',
                padding: '8px',
              }}
            >
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

            {/* 选中的变量 */}
            {inputValue && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#e6f7ff',
                  borderRadius: '4px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  已选择: <strong style={{ fontFamily: 'monospace' }}>{inputValue}</strong>
                </span>
                <button
                  onClick={() => setInputValue('')}
                  style={{
                    padding: '2px 8px',
                    border: '1px solid #ff4d4f',
                    borderRadius: '2px',
                    backgroundColor: '#fff',
                    color: '#ff4d4f',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  清除选择
                </button>
              </div>
            )}
          </div>
        )}

        {/* 表达式模式 */}
        {mode === 'expression' && (
          <div>
            <MonacoEditor
              value={editorValue}
              onChange={(val) => setInputValue(stripJSDoc(val))}
              height={600}
              language="javascript"
              theme="dark"
              completionItems={expressionCompletionItems}
            />

            {/* 返回类型选择（当自动推断可能失败时使用） */}
            {expectedType && (
              <div style={{ marginTop: '12px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: '#666',
                  }}
                >
                  <span>返回类型（可选，用于复杂表达式）：</span>
                  <select
                    value={manualReturnType || ''}
                    onChange={(e) => setManualReturnType(e.target.value as BaseType || null)}
                    style={{
                      padding: '4px 8px',
                      border: '1px solid #d9d9d9',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: '#fff',
                    }}
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
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '24px',
          }}
        >
          <button
            onClick={handleClear}
            style={{
              padding: '8px 16px',
              border: '1px solid #ff4d4f',
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: '#fff',
              color: '#ff4d4f',
              fontSize: '13px',
            }}
          >
            清除绑定
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 24px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: '#fff',
              }}
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              style={{
                padding: '8px 24px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: '#1890ff',
                color: '#fff',
              }}
            >
              确定
            </button>
          </div>
        </div>
      </div>

      {/* 类型不匹配确认对话框 */}
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

/**
 * 变量树节点组件
 */
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
