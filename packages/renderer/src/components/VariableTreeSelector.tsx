/**
 * VariableTreeSelector — 变量树选择弹窗
 *
 * 弹窗模式的变量树选择组件，支持：
 * - 单选/多选模式
 * - 环境变量按需注入（pageId 或 pageComponents）
 * - 类型校验（expectedType 对比）
 * - 搜索过滤
 * - 仅叶子节点可选（leafOnly）
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { environmentRegistry } from '../core/EnvironmentRegistry';
import {
  resolveVariableType,
  isTypeCompatible,
  getTypeMismatchMessage,
  logAnyTypeWarnings,
  type BaseType,
} from '../core/expression-type-infer';
import { TypeMismatchModal } from './TypeMismatchModal';
import { VariableTree } from './VariableTree';
import type { VariableTreeMultiValue } from './VariableTree';
import { fetchPageComponents, type PageComponentDefinition } from '../utils/page-components';

// ─── 类型 ─────────────────────────────────────────────

/** 多选返回值类型 */
export type VariableTreeSelectorMultiValue = VariableTreeMultiValue;

/** 类型不匹配对话框状态 */
interface MismatchState {
  visible: boolean;
  expectedType: string;
  actualType: string;
  message: string;
}

/** 组件变量树选择器属性 */
export interface VariableTreeSelectorProps {
  visible: boolean;
  /** 选中值（单选时为变量路径字符串） */
  value?: string;
  /** 单选/多选模式 */
  multiSelect?: boolean;
  /** 多选初始值（变量路径数组） */
  initialSelectedKeys?: string[];
  /** 确认回调。单选返回 { type: 'variable', value }，多选返回数组 */
  onChange: (
    value:
      | { type: 'variable'; value: string }
      | Array<{ type: 'variable'; value: string }>,
  ) => void;
  onClear: () => void;
  onClose: () => void;
  /** 页面 ID（用于获取组件定义注入 $component，与 pageComponents 二选一） */
  pageId?: string;
  /** 应用 ID（配合 pageId 使用） */
  appId?: string;
  /** 页面组件列表（未保存页面时由外部传入，与 pageId 二选一） */
  pageComponents?: Record<string, PageComponentDefinition>;
  /** 页面数据源列表 */
  pageDataSources?: Record<string, { type: string; description?: string }>;
  /** 属性期望类型（用于类型校验） */
  expectedType?: string;
  /** 限定显示的顶层环境变量（如 ["$component"]），不传则显示全部 */
  env?: string[];
  /** 仅叶子节点可选（默认 false） */
  leafOnly?: boolean;
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

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: '8px',
  padding: '24px',
  width: '600px',
  maxHeight: '90vh',
  overflow: 'auto',
};

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

const clearBtnStyle: React.CSSProperties = {
  padding: '2px 8px',
  border: '1px solid #ff4d4f',
  borderRadius: '2px',
  backgroundColor: '#fff',
  color: '#ff4d4f',
  cursor: 'pointer',
  fontSize: '12px',
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

const typeWarningStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '4px',
  fontSize: '12px',
  backgroundColor: '#fff7e6',
  border: '1px solid #ffd591',
  color: '#fa8c16',
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

// ─── 主组件 ────────────────────────────────────────────

/**
 * 变量树选择器（弹窗模式）
 *
 * 展示环境变量树供用户选择变量引用。
 * 支持单选/多选，类型校验，搜索过滤，叶子节点约束。
 */
export function VariableTreeSelector(props: VariableTreeSelectorProps) {
  const {
    visible,
    value = '',
    multiSelect = false,
    initialSelectedKeys = [],
    onChange,
    onClear,
    onClose,
    pageId,
    appId,
    pageComponents: externalPageComponents,
    pageDataSources = {},
    expectedType,
    env,
    leafOnly = false,
  } = props;

  // ─── 状态 ─────────────────────────────────────────────

  const [inputValue, setInputValue] = useState(() => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'value' in value) return (value as { value: string }).value;
    return '';
  });
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set(initialSelectedKeys));
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [mismatchInfo, setMismatchInfo] = useState<MismatchState | null>(null);
  const [inferredType, setInferredType] = useState<BaseType | null>(null);
  const [resolvedPageComponents, setResolvedPageComponents] = useState<
    Record<string, PageComponentDefinition> | undefined
  >(undefined);

  // ─── Refs ─────────────────────────────────────────────

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
    if (typeof value === 'string') setInputValue(value);
    else if (value && typeof value === 'object' && 'value' in value) setInputValue((value as { value: string }).value);
    else setInputValue('');
  }, [value]);

  // ─── 类型推断 ─────────────────────────────────────────

  useEffect(() => {
    if (!expectedType || !inputValue.trim()) {
      setInferredType(null);
      return;
    }
    const { type, warnings } = resolveVariableType(inputValue);
    setInferredType(type);
    if (warnings.length > 0) logAnyTypeWarnings(warnings, '变量引用');
  }, [inputValue, expectedType]);

  const isCompatible = useMemo(() => {
    if (!expectedType || !inferredType) return true;
    if (inferredType === 'any') return true;
    return isTypeCompatible(expectedType, inferredType);
  }, [expectedType, inferredType]);

  // ─── 事件处理 ─────────────────────────────────────────

  const handleSelectVariable = useCallback((key: string) => {
    setInputValue(key);
  }, []);

  /** 类型校验 */
  const validateType = useCallback(
    (val: string): boolean => {
      if (!expectedType) return true;
      const { type: varType, warnings } = resolveVariableType(val);
      if (warnings.length > 0) logAnyTypeWarnings(warnings, '变量引用');
      if (varType && varType !== 'any' && !isTypeCompatible(expectedType, varType)) {
        setMismatchInfo({
          visible: true,
          expectedType,
          actualType: varType,
          message: getTypeMismatchMessage(expectedType, varType),
        });
        return false;
      }
      return true;
    },
    [expectedType],
  );

  /** 确认选择 */
  const handleConfirm = useCallback(() => {
    if (multiSelect) {
      const result = Array.from(selectedKeys).map((key) => ({
        type: 'variable' as const,
        value: key,
      }));
      onChange(result);
      onClose();
      return;
    }

    if (!validateType(inputValue)) return;

    onChange({ type: 'variable', value: inputValue });
    onClose();
  }, [multiSelect, selectedKeys, inputValue, validateType, onChange, onClose]);

  const handleMismatchContinue = useCallback(() => {
    setMismatchInfo(null);
    onChange({ type: 'variable', value: inputValue });
    onClose();
  }, [inputValue, onChange, onClose]);

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
          选择变量
        </h3>

        {/* 变量树（复用 VariableTree 组件） */}
        <VariableTree
          multiSelect={multiSelect}
          selectedKey={inputValue}
          onSelect={handleSelectVariable}
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          leafOnly={leafOnly}
          env={env}
          searchable
          showSelectAll
          refreshKey={refreshCounter}
        />

        {/* 单选已选变量 */}
        {!multiSelect && inputValue && (
          <div style={selectedVarStyle}>
            <span>
              已选择: <strong style={{ fontFamily: 'monospace' }}>{inputValue}</strong>
            </span>
            <button onClick={() => setInputValue('')} style={clearBtnStyle}>
              清除选择
            </button>
          </div>
        )}

        {/* 类型信息 */}
        {expectedType && inputValue && !multiSelect && (
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

        {/* 操作栏 */}
        <div style={footerStyle}>
          {multiSelect ? (
            <span style={{ fontSize: '12px', color: selectedKeys.size > 0 ? '#1890ff' : '#999' }}>
              已选 {selectedKeys.size} 个变量
            </span>
          ) : (
            <button onClick={handleClear} style={clearBindingBtnStyle}>
              清除绑定
            </button>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} style={cancelBtnStyle}>
              取消
            </button>
            <button
              onClick={handleConfirm}
              style={confirmBtnStyle}
              disabled={multiSelect && selectedKeys.size === 0}
            >
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
          onContinue={handleMismatchContinue}
          onCancel={handleMismatchCancel}
        />
      )}
    </div>
  );
}
