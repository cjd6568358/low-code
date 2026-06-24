/**
 * SelectableTree — 可多选的树组件
 *
 * 通用的多选树，支持：
 * - 复选框多选
 * - 展开/折叠
 * - 搜索过滤
 * - 全选/取消全选
 *
 * 用于页面组件选择、变量批量选择等场景。
 */

import React, { useState, useMemo, useCallback } from 'react';

// ─── 类型 ──────────────────────────────────────────────

/** 树节点 */
export interface TreeNodeData {
  /** 节点唯一标识 */
  key: string;
  /** 显示文本 */
  label: string;
  /** 描述信息（显示在 label 后方） */
  description?: string;
  /** 子节点 */
  children?: TreeNodeData[];
  /** 自定义数据（透传给回调） */
  extra?: Record<string, unknown>;
}

/** 选中变更回调 */
export type SelectedKeys = Set<string>;

/** onChange 回调类型 — 支持直接值或 updater 函数 */
export type SelectedKeysChange = SelectedKeys | ((prev: SelectedKeys) => SelectedKeys);

// ─── 样式（模块级常量，避免重复创建） ──────────────────

const containerStyle: React.CSSProperties = {
  border: '1px solid #e8e8e8',
  borderRadius: 6,
  overflow: 'hidden',
};

const searchBarStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #f0f0f0',
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 8px',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const treeBodyStyle: React.CSSProperties = {
  maxHeight: 320,
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

const arrowStyle: React.CSSProperties = { fontSize: 10, width: 14, textAlign: 'center', color: '#999' };
const arrowPlaceholderStyle: React.CSSProperties = { width: 14 };
const checkIconStyle: React.CSSProperties = { color: '#fff', fontSize: 10, fontWeight: 700 };

const emptyStyle: React.CSSProperties = {
  padding: '24px 0',
  textAlign: 'center',
  color: '#999',
  fontSize: 13,
};

// ─── 子组件 ────────────────────────────────────────────

interface TreeNodeProps {
  node: TreeNodeData;
  level: number;
  selectedKeys: SelectedKeys;
  onToggle: (key: string) => void;
  searchKeyword: string;
}

/** 搜索高亮 */
function highlightLabel(text: string, keyword: string): React.ReactNode {
  if (!keyword) return text;
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: '#ff4d4f', fontWeight: 600 }}>
        {text.slice(idx, idx + keyword.length)}
      </span>
      {text.slice(idx + keyword.length)}
    </>
  );
}

/** 单个树节点 — memo 化避免选中变更时全量重渲染 */
const TreeNode = React.memo(function TreeNode({ node, level, selectedKeys, onToggle, searchKeyword }: TreeNodeProps) {
  const [userExpanded, setUserExpanded] = useState(false);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isChecked = selectedKeys.has(node.key);
  // 搜索时自动展开，用户手动折叠优先
  const expanded = searchKeyword ? true : userExpanded;

  const rowStyle = useMemo((): React.CSSProperties => ({
    padding: `5px 12px 5px ${12 + level * 16}px`,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    background: isChecked ? '#f0f5ff' : 'transparent',
    transition: 'background 0.15s',
  }), [level, isChecked]);

  const checkboxStyle = useMemo((): React.CSSProperties => ({
    width: 14,
    height: 14,
    border: `2px solid ${isChecked ? '#1890ff' : '#d9d9d9'}`,
    borderRadius: 3,
    background: isChecked ? '#1890ff' : '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.15s',
  }), [isChecked]);

  const labelStyle = useMemo((): React.CSSProperties => ({
    fontFamily: hasChildren ? 'inherit' : 'monospace',
    color: hasChildren ? '#262626' : '#1890ff',
  }), [hasChildren]);

  const handleClick = useCallback(() => {
    if (hasChildren) {
      setUserExpanded((v) => !v);
    } else {
      onToggle(node.key);
    }
  }, [hasChildren, onToggle, node.key]);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (!isChecked) (e.currentTarget as HTMLElement).style.background = '#fafafa';
  }, [isChecked]);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    if (!isChecked) (e.currentTarget as HTMLElement).style.background = 'transparent';
  }, [isChecked]);

  return (
    <div>
      <div
        onClick={handleClick}
        style={rowStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {hasChildren ? (
          <span style={arrowStyle}>{expanded ? '▼' : '▶'}</span>
        ) : (
          <span style={arrowPlaceholderStyle} />
        )}

        {!hasChildren && (
          <span style={checkboxStyle}>
            {isChecked && <span style={checkIconStyle}>✓</span>}
          </span>
        )}

        <span style={labelStyle}>{highlightLabel(node.label, searchKeyword)}</span>

        {node.description && (
          <span style={{ color: '#999', fontSize: 11, marginLeft: 4 }}>
            {node.description}
          </span>
        )}
      </div>

      {expanded && hasChildren && node.children!.map((child) => (
        <TreeNode
          key={child.key}
          node={child}
          level={level + 1}
          selectedKeys={selectedKeys}
          onToggle={onToggle}
          searchKeyword={searchKeyword}
        />
      ))}
    </div>
  );
});

// ─── 主组件 ────────────────────────────────────────────

export interface SelectableTreeProps {
  /** 树数据 */
  data: TreeNodeData[];
  /** 已选中的 key 集合 */
  selectedKeys: SelectedKeys;
  /** 选中变更回调（支持直接值或 updater 函数） */
  onChange: (keys: SelectedKeysChange) => void;
  /** 是否显示搜索框 */
  searchable?: boolean;
  /** 搜索框占位文本 */
  searchPlaceholder?: string;
  /** 是否显示全选 */
  showSelectAll?: boolean;
  /** 自定义统计文本 */
  countText?: (selected: number, total: number) => string;
}

/** 收集所有叶子节点 key */
function collectLeafKeys(nodes: TreeNodeData[]): string[] {
  const keys: string[] = [];
  for (const node of nodes) {
    if (node.children?.length) {
      keys.push(...collectLeafKeys(node.children));
    } else {
      keys.push(node.key);
    }
  }
  return keys;
}

export function SelectableTree({
  data,
  selectedKeys,
  onChange,
  searchable = true,
  searchPlaceholder = '搜索...',
  showSelectAll = true,
  countText,
}: SelectableTreeProps) {
  const [searchKeyword, setSearchKeyword] = useState('');

  const allLeafKeys = useMemo(() => collectLeafKeys(data), [data]);

  const filteredData = useMemo(() => {
    if (!searchKeyword) return data;
    const keyword = searchKeyword.toLowerCase();

    const filterTree = (nodes: TreeNodeData[]): TreeNodeData[] =>
      nodes
        .map((node) => {
          const filteredChildren = node.children ? filterTree(node.children) : [];
          const selfMatch =
            node.label.toLowerCase().includes(keyword) ||
            (node.description?.toLowerCase().includes(keyword) ?? false);

          if (selfMatch || filteredChildren.length > 0) {
            return { ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children };
          }
          return null;
        })
        .filter(Boolean) as TreeNodeData[];

    return filterTree(data);
  }, [data, searchKeyword]);

  const filteredLeafKeys = useMemo(() => collectLeafKeys(filteredData), [filteredData]);

  const handleToggle = useCallback((key: string) => {
    const updater = (prev: SelectedKeys) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    };
    onChange(updater);
  }, [onChange]);

  const handleToggleAll = useCallback(() => {
    const allSelected = filteredLeafKeys.every((k) => selectedKeys.has(k));
    const updater = (prev: SelectedKeys) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const k of filteredLeafKeys) next.delete(k);
      } else {
        for (const k of filteredLeafKeys) next.add(k);
      }
      return next;
    };
    onChange(updater);
  }, [filteredLeafKeys, selectedKeys, onChange]);

  const allSelected = filteredLeafKeys.length > 0 && filteredLeafKeys.every((k) => selectedKeys.has(k));

  const displayText = countText
    ? countText(selectedKeys.size, allLeafKeys.length)
    : `已选 ${selectedKeys.size} / ${allLeafKeys.length}`;

  return (
    <div style={containerStyle}>
      {showSelectAll && (
        <div style={headerStyle}>
          <span>{displayText}</span>
          <button onClick={handleToggleAll} style={actionBtnStyle}>
            {allSelected ? '取消全选' : '全选'}
          </button>
        </div>
      )}

      {searchable && (
        <div style={searchBarStyle}>
          <input
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder={searchPlaceholder}
            style={searchInputStyle}
          />
        </div>
      )}

      <div style={treeBodyStyle}>
        {filteredData.length === 0 && (
          <div style={emptyStyle}>
            {searchKeyword ? '未找到匹配项' : '暂无数据'}
          </div>
        )}
        {filteredData.map((node) => (
          <TreeNode
            key={node.key}
            node={node}
            level={0}
            selectedKeys={selectedKeys}
            onToggle={handleToggle}
            searchKeyword={searchKeyword}
          />
        ))}
      </div>
    </div>
  );
}
