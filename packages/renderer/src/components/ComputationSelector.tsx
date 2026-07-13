/**
 * 运算规则选择器
 *
 * 用于流程计算节点选择已定义的运算规则，支持：
 * - 从 API 加载运算规则列表
 * - 显示规则名称、类型、描述
 * - 支持搜索过滤
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';

/** 运算规则摘要 */
interface ComputationSummary {
  computationId: string;
  name: string;
  type: string;
  description?: string;
  status: string;
}

/** 组件属性 */
export interface ComputationSelectorProps {
  /** 选中的运算规则 ID */
  value?: string;
  /** 选择回调 */
  onChange: (computationId: string) => void;
  /** 应用 ID */
  appId: string;
  /** 占位提示 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

// ─── 样式 ──────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  position: 'relative',
};

const triggerStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  fontSize: 13,
  background: '#fff',
  cursor: 'pointer',
  textAlign: 'left',
  minHeight: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  marginTop: 4,
  backgroundColor: '#fff',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  zIndex: 1000,
  maxHeight: 300,
  overflow: 'auto',
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: 'none',
  borderBottom: '1px solid #f0f0f0',
  fontSize: 13,
  outline: 'none',
};

const itemStyle: React.CSSProperties = {
  padding: '8px 12px',
  cursor: 'pointer',
  borderBottom: '1px solid #f5f5f5',
};

const itemHoverStyle: React.CSSProperties = {
  ...itemStyle,
  backgroundColor: '#f5f5f5',
};

const selectedStyle: React.CSSProperties = {
  ...itemStyle,
  backgroundColor: '#e6f7ff',
};

const itemNameStyle: React.CSSProperties = {
  fontWeight: 500,
  fontSize: 13,
};

const itemDescStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#999',
  marginTop: 2,
};

const tagStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0 6px',
  fontSize: 11,
  borderRadius: 2,
  marginLeft: 8,
};

const placeholderStyle: React.CSSProperties = {
  color: '#999',
  fontSize: 13,
};

const emptyStyle: React.CSSProperties = {
  padding: '16px 12px',
  textAlign: 'center',
  color: '#999',
  fontSize: 13,
};

// ─── 类型颜色映射 ──────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  field: { bg: '#e6f7ff', color: '#1890ff' },
  formula: { bg: '#f6ffed', color: '#52c41a' },
  aggregation: { bg: '#fff7e6', color: '#fa8c16' },
  transform: { bg: '#f9f0ff', color: '#722ed1' },
};

const TYPE_LABELS: Record<string, string> = {
  field: '字段计算',
  formula: '公式规则',
  aggregation: '聚合计算',
  transform: '数据转换',
};

// ─── 主组件 ────────────────────────────────────────────────

/**
 * 运算规则选择器
 */
export const ComputationSelector: React.FC<ComputationSelectorProps> = ({
  value,
  onChange,
  appId,
  placeholder = '选择运算规则',
  disabled = false,
}) => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [computations, setComputations] = useState<ComputationSummary[]>([]);
  const [searchText, setSearchText] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // ─── 加载数据 ─────────────────────────────────────────

  const fetchComputations = useCallback(async () => {
    if (!appId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/apps/${appId}/computations`);
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        // 只显示启用状态的规则
        setComputations(
          data.data.filter((c: ComputationSummary) => c.status === 'active')
        );
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    if (visible) {
      fetchComputations();
    }
  }, [visible, fetchComputations]);

  // ─── 过滤逻辑 ─────────────────────────────────────────

  const filteredComputations = useMemo(() => {
    if (!searchText) return computations;

    const search = searchText.toLowerCase();
    return computations.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        (c.description && c.description.toLowerCase().includes(search))
    );
  }, [computations, searchText]);

  // ─── 事件处理 ─────────────────────────────────────────

  const handleSelect = useCallback(
    (computationId: string) => {
      onChange(computationId);
      setVisible(false);
      setSearchText('');
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange('');
    },
    [onChange]
  );

  // ─── 渲染 ────────────────────────────────────────────

  const selectedComputation = computations.find(
    (c) => c.computationId === value
  );

  return (
    <div style={containerStyle}>
      <div
        style={{
          ...triggerStyle,
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        onClick={() => !disabled && setVisible(!visible)}
      >
        {selectedComputation ? (
          <span style={itemNameStyle}>{selectedComputation.name}</span>
        ) : (
          <span style={placeholderStyle}>{loading ? '加载中...' : placeholder}</span>
        )}
        <span style={{ fontSize: 10, color: '#999' }}>
          {value ? (
            <span
              onClick={handleClear}
              style={{ cursor: 'pointer', padding: '0 4px' }}
            >
              ✕
            </span>
          ) : (
            '▼'
          )}
        </span>
      </div>

      {visible && (
        <div style={dropdownStyle}>
          <input
            style={searchInputStyle}
            placeholder="搜索运算规则..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            autoFocus
          />

          {filteredComputations.length === 0 ? (
            <div style={emptyStyle}>
              {loading ? '加载中...' : '暂无可用的运算规则'}
            </div>
          ) : (
            filteredComputations.map((computation) => {
              const isHovered = hoveredId === computation.computationId;
              const isSelected = value === computation.computationId;
              const typeColor = TYPE_COLORS[computation.type] || TYPE_COLORS.field;

              return (
                <div
                  key={computation.computationId}
                  style={isSelected ? selectedStyle : isHovered ? itemHoverStyle : itemStyle}
                  onMouseEnter={() => setHoveredId(computation.computationId)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleSelect(computation.computationId)}
                >
                  <div>
                    <span style={itemNameStyle}>{computation.name}</span>
                    <span
                      style={{
                        ...tagStyle,
                        backgroundColor: typeColor.bg,
                        color: typeColor.color,
                      }}
                    >
                      {TYPE_LABELS[computation.type] || computation.type}
                    </span>
                  </div>
                  {computation.description && (
                    <div style={itemDescStyle}>{computation.description}</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default ComputationSelector;
