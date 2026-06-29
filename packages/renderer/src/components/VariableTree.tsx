/**
 * VariableTree — 通用变量树组件
 *
 * 统一的变量树组件，支持两种交互模式：
 * - 单选模式（multiSelect=false）：点击叶子节点选中，高亮显示
 * - 多选模式（multiSelect=true）：复选框勾选，支持全选/取消全选
 *
 * 数据源：
 * - 传 data prop 使用自定义数据
 * - 不传则从 EnvironmentRegistry 自动生成
 *
 * 可选约束：
 * - leafOnly=true 时仅叶子节点可选，非叶子节点只展开/折叠
 */

import React, { useState, useMemo, useCallback } from 'react';
import { environmentRegistry, type VariableTreeNode } from '../core/EnvironmentRegistry';

// ─── 类型 ──────────────────────────────────────────────

/** 多选返回值 */
export type VariableTreeMultiValue = Array<{ type: 'variable'; value: string }>;

/** 组件属性 */
export interface VariableTreeProps {
  /** 自定义数据源（不传则从 EnvironmentRegistry 生成） */
  data?: VariableTreeNode[];
  /** 单选/多选模式（默认 false） */
  multiSelect?: boolean;
  /** 单选时的选中 key */
  selectedKey?: string;
  /** 单选变更回调 */
  onSelect?: (key: string) => void;
  /** 多选时的选中 keys */
  selectedKeys?: Set<string>;
  /** 多选变更回调 */
  onSelectionChange?: (keys: Set<string>) => void;
  /** 仅叶子节点可选（默认 false） */
  leafOnly?: boolean;
  /** 限定显示的顶层环境变量（如 ["$component"]） */
  env?: string[];
  /** 是否显示搜索框（默认 true） */
  searchable?: boolean;
  /** 是否显示全选按钮，仅多选模式有效（默认 true） */
  showSelectAll?: boolean;
  /** 自定义统计文本，仅多选模式 */
  countText?: (selected: number, total: number) => string;
  /** 刷新 key，变更时重新从 EnvironmentRegistry 拉取数据 */
  refreshKey?: number;
}

// ─── 样式常量 ──────────────────────────────────────────

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 12px',
  border: '1px solid #d9d9d9',
  borderRadius: '4px',
  marginBottom: '8px',
  boxSizing: 'border-box',
};

const treeContainerStyle: React.CSSProperties = {
  border: '1px solid #e8e8e8',
  borderRadius: '4px',
  maxHeight: '300px',
  overflow: 'auto',
  padding: '4px 0',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 12px',
  borderBottom: '1px solid #f0f0f0',
  fontSize: 12,
  color: '#666',
};

const actionBtnStyle: React.CSSProperties = {
  padding: '2px 8px',
  border: '1px solid #d9d9d9',
  borderRadius: 3,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 12,
  color: '#1890ff',
};

const emptyStyle: React.CSSProperties = {
  padding: '16px',
  textAlign: 'center',
  color: '#999',
  fontSize: 13,
};

// ─── 工具函数 ──────────────────────────────────────────

/** 收集所有叶子节点 key */
function collectLeafKeys(nodes: VariableTreeNode[]): string[] {
  const keys: string[] = [];
  for (const node of nodes) {
    if (node.children.length > 0) {
      keys.push(...collectLeafKeys(node.children));
    } else {
      keys.push(node.key);
    }
  }
  return keys;
}

/** 收集所有节点 key（含父节点） */
function collectAllKeys(nodes: VariableTreeNode[]): string[] {
  const keys: string[] = [];
  for (const node of nodes) {
    keys.push(node.key);
    if (node.children.length > 0) {
      keys.push(...collectAllKeys(node.children));
    }
  }
  return keys;
}

/** 搜索过滤树 */
function filterTree(nodes: VariableTreeNode[], keyword: string): VariableTreeNode[] {
  const lowerKeyword = keyword.toLowerCase();
  return nodes
    .map((node) => {
      const filteredChildren = filterTree(node.children, keyword);
      const selfMatch =
        node.label.toLowerCase().includes(lowerKeyword) ||
        node.key.toLowerCase().includes(lowerKeyword) ||
        node.description.toLowerCase().includes(lowerKeyword);
      if (selfMatch || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    })
    .filter(Boolean) as VariableTreeNode[];
}

// ─── 树节点子组件 ──────────────────────────────────────

interface TreeNodeProps {
  node: VariableTreeNode;
  level: number;
  /** 单选 key */
  selectedKey: string;
  /** 单选回调 */
  onSelect: (key: string) => void;
  /** 多选 keys */
  selectedKeys: Set<string>;
  /** 多选切换回调 */
  onToggle: (key: string) => void;
  /** 多选模式 */
  multiSelect: boolean;
  /** 仅叶子可选 */
  leafOnly: boolean;
  /** 搜索关键词（用于自动展开） */
  searchKeyword: string;
}

const TreeNodeRow = React.memo(function TreeNodeRow({
  node,
  level,
  selectedKey,
  onSelect,
  selectedKeys,
  onToggle,
  multiSelect,
  leafOnly,
  searchKeyword,
}: TreeNodeProps) {
  const [userExpanded, setUserExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  const isLeaf = !hasChildren;
  const isSelectable = !leafOnly || isLeaf;

  // 多选状态
  const isMultiChecked = multiSelect && selectedKeys.has(node.key);
  // 单选状态
  const isSingleSelected = !multiSelect && selectedKey === node.key;

  // 搜索时自动展开
  const expanded = searchKeyword ? true : userExpanded;

  const rowStyle = useMemo((): React.CSSProperties => ({
    padding: `5px 12px 5px ${12 + level * 16}px`,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    background: isSingleSelected || isMultiChecked ? '#f0f5ff' : 'transparent',
    transition: 'background 0.15s',
  }), [level, isSingleSelected, isMultiChecked]);

  const checkboxStyle = useMemo((): React.CSSProperties => ({
    width: 14,
    height: 14,
    border: `2px solid ${isMultiChecked ? '#1890ff' : '#d9d9d9'}`,
    borderRadius: 3,
    background: isMultiChecked ? '#1890ff' : '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.15s',
  }), [isMultiChecked]);

  const labelStyle = useMemo((): React.CSSProperties => ({
    fontFamily: isLeaf ? 'monospace' : 'inherit',
    color: isLeaf ? '#1890ff' : '#262626',
  }), [isLeaf]);

  /** 点击行 → 选中/展开 */
  const handleRowClick = useCallback(() => {
    if (multiSelect) {
      // 多选：可选节点切换选中，不可选节点展开/折叠
      if (isSelectable) {
        onToggle(node.key);
      } else if (hasChildren) {
        setUserExpanded((v) => !v);
      }
    } else {
      // 单选：可选节点选中，不可选节点展开/折叠
      if (isSelectable) {
        onSelect(node.key);
      } else if (hasChildren) {
        setUserExpanded((v) => !v);
      }
    }
  }, [multiSelect, isSelectable, hasChildren, node.key, onToggle, onSelect]);

  /** 点击箭头 → 仅展开/折叠 */
  const handleArrowClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setUserExpanded((v) => !v);
  }, []);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (!isSingleSelected && !isMultiChecked) {
      (e.currentTarget as HTMLElement).style.background = '#fafafa';
    }
  }, [isSingleSelected, isMultiChecked]);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    if (!isSingleSelected && !isMultiChecked) {
      (e.currentTarget as HTMLElement).style.background = 'transparent';
    }
  }, [isSingleSelected, isMultiChecked]);

  return (
    <div>
      <div
        onClick={handleRowClick}
        style={rowStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* 展开箭头 */}
        {hasChildren ? (
          <span
            style={{ fontSize: 10, width: 14, textAlign: 'center', color: '#999', cursor: 'pointer' }}
            onClick={handleArrowClick}
          >
            {expanded ? '▼' : '▶'}
          </span>
        ) : (
          <span style={{ width: 14 }} />
        )}

        {/* 多选复选框 */}
        {multiSelect && (
          <span style={checkboxStyle}>
            {isMultiChecked && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
          </span>
        )}

        {/* 标签 */}
        <span style={labelStyle}>{node.label}</span>

        {/* 跨应用标签 */}
        {node.isCrossApp && node.appName && (
          <span style={{
            fontSize: 10, color: '#fa8c16', backgroundColor: '#fff7e6',
            padding: '1px 4px', borderRadius: 2, border: '1px solid #ffd591',
          }}>
            {node.appName}
          </span>
        )}

        {/* 描述 */}
        <span style={{ color: '#999', fontSize: 11, marginLeft: 4 }}>
          {node.description}
        </span>
      </div>

      {/* 子节点 */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.key}
              node={child}
              level={level + 1}
              selectedKey={selectedKey}
              onSelect={onSelect}
              selectedKeys={selectedKeys}
              onToggle={onToggle}
              multiSelect={multiSelect}
              leafOnly={leafOnly}
              searchKeyword={searchKeyword}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// ─── 主组件 ────────────────────────────────────────────

/**
 * 通用变量树组件
 *
 * 支持单选/多选，叶子节点约束，自定义数据源或 EnvironmentRegistry 自动生成。
 */
export function VariableTree({
  data: externalData,
  multiSelect = false,
  selectedKey = '',
  onSelect,
  selectedKeys: externalSelectedKeys,
  onSelectionChange,
  leafOnly = false,
  env,
  searchable = true,
  showSelectAll = true,
  countText,
  refreshKey,
}: VariableTreeProps) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<Set<string>>(new Set());

  // 多选 keys（支持受控/非受控）
  const selectedKeys = externalSelectedKeys ?? internalSelectedKeys;

  // ─── 数据源 ──────────────────────────────────────────

  const rawTree = useMemo(() => {
    if (externalData) return externalData;
    const tree = environmentRegistry.generateVariableTree('variable');
    return env ? tree.filter((node) => env.includes(node.key)) : tree;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalData, env, refreshKey]);

  // ─── 搜索过滤 ────────────────────────────────────────

  const filteredTree = useMemo(() => {
    if (!searchKeyword) return rawTree;
    return filterTree(rawTree, searchKeyword);
  }, [rawTree, searchKeyword]);

  // ─── 全选相关 ────────────────────────────────────────

  const allKeys = useMemo(
    () => leafOnly ? collectLeafKeys(filteredTree) : collectAllKeys(filteredTree),
    [filteredTree, leafOnly],
  );

  const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedKeys.has(k));

  // ─── 事件处理 ────────────────────────────────────────

  /** 单选回调 */
  const handleSelect = useCallback((key: string) => {
    onSelect?.(key);
  }, [onSelect]);

  /** 多选切换 */
  const handleToggle = useCallback((key: string) => {
    const updater = (prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    };
    if (onSelectionChange) {
      onSelectionChange(updater(selectedKeys));
    } else {
      setInternalSelectedKeys(updater);
    }
  }, [selectedKeys, onSelectionChange]);

  /** 全选/取消全选 */
  const handleToggleAll = useCallback(() => {
    const next = new Set(selectedKeys);
    if (allSelected) {
      for (const k of allKeys) next.delete(k);
    } else {
      for (const k of allKeys) next.add(k);
    }
    if (onSelectionChange) {
      onSelectionChange(next);
    } else {
      setInternalSelectedKeys(next);
    }
  }, [allKeys, allSelected, selectedKeys, onSelectionChange]);

  // ─── 渲染 ────────────────────────────────────────────

  const displayText = countText
    ? countText(selectedKeys.size, allKeys.length)
    : `已选 ${selectedKeys.size} / ${allKeys.length}`;

  return (
    <div>
      {/* 搜索框 */}
      {searchable && (
        <input
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="搜索变量..."
          style={searchInputStyle}
        />
      )}

      {/* 多选全选头 */}
      {multiSelect && showSelectAll && (
        <div style={headerStyle}>
          <span>{displayText}</span>
          <button onClick={handleToggleAll} style={actionBtnStyle}>
            {allSelected ? '取消全选' : '全选'}
          </button>
        </div>
      )}

      {/* 树 */}
      <div style={treeContainerStyle}>
        {filteredTree.length === 0 && (
          <div style={emptyStyle}>
            {searchKeyword ? '未找到匹配项' : '暂无数据'}
          </div>
        )}
        {filteredTree.map((node) => (
          <TreeNodeRow
            key={node.key}
            node={node}
            level={0}
            selectedKey={selectedKey}
            onSelect={handleSelect}
            selectedKeys={selectedKeys}
            onToggle={handleToggle}
            multiSelect={multiSelect}
            leafOnly={leafOnly}
            searchKeyword={searchKeyword}
          />
        ))}
      </div>
    </div>
  );
}
