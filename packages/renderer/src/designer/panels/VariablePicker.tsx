import React, { useState, useMemo } from 'react';

/** 变量选择器属性 */
export interface VariablePickerProps {
  visible: boolean;
  value?: string;
  bindingType?: 'static' | 'variable' | 'expression';
  onChange: (value: string, bindingType: 'static' | 'variable' | 'expression') => void;
  onClose: () => void;
  variableSources?: VariableSource[];
}

export interface VariableSource {
  label: string;
  key: string;
  children: VariableSource[];
}

/**
 * 变量选择器
 *
 * 文档描述：
 * 点击 🔗 按钮后弹出变量选择器，支持三种绑定方式：
 * - 静态值：直接输入固定值
 * - 变量引用：从变量树中选择变量
 * - 表达式：使用表达式编辑器编写
 *
 * 变量源：
 * - 页面上下文 ($context) — 当前用户、当前记录、路由参数、全局变量
 * - 表单数据 ($form) — 所属表单的字段值
 * - API 返回值 ($api) — 页面已配置的 API 接口返回数据
 * - 其他组件 — 页面中其他组件的可读属性
 */
export function VariablePicker(props: VariablePickerProps) {
  const { visible, value = '', bindingType: propBindingType, onChange, onClose, variableSources } = props;

  const [bindingType, setBindingType] = useState<'static' | 'variable' | 'expression'>(propBindingType || 'static');
  const [inputValue, setInputValue] = useState(value);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 默认变量源
  const defaultSources: VariableSource[] = useMemo(() => [
    {
      label: '页面上下文',
      key: '$context',
      children: [
        { label: '当前用户', key: '$context.currentUser', children: [
          { label: '用户ID', key: '$context.currentUser.id', children: [] },
          { label: '用户名', key: '$context.currentUser.name', children: [] },
          { label: '角色', key: '$context.currentUser.roles', children: [] },
          { label: '部门', key: '$context.currentUser.department', children: [] },
          { label: '部门名称', key: '$context.currentUser.departmentName', children: [] },
          { label: '岗位', key: '$context.currentUser.position', children: [] },
        ]},
        { label: '平台', key: '$context.platform', children: [] },
        { label: '权限', key: '$context.permissions', children: [
          { label: '可见菜单ID列表', key: '$context.permissions.menus', children: [] },
          { label: '可用按钮ID列表', key: '$context.permissions.buttons', children: [] },
          { label: '📋 判断权限 (has)', key: "$context.permissions.has('menu', '菜单ID', 'read')", children: [] },
          { label: '📋 判断任一权限 (hasAny)', key: "$context.permissions.hasAny('button', '按钮ID', ['read','delete'])", children: [] },
        ]},
        { label: '当前记录', key: '$context.currentRecord', children: [] },
        { label: '路由参数', key: '$context.route.params', children: [] },
        { label: '全局变量', key: '$context.global', children: [] },
      ],
    },
    {
      label: '表单数据',
      key: '$form',
      children: [],
    },
    {
      label: 'API 返回值',
      key: '$api',
      children: [],
    },
  ], []);

  const sources = variableSources || defaultSources;

  // 过滤变量树
  const filteredSources = useMemo(() => {
    if (!searchKeyword) return sources;
    const keyword = searchKeyword.toLowerCase();
    const filterTree = (nodes: VariableSource[]): VariableSource[] => {
      return nodes
        .map((node) => {
          const filteredChildren = filterTree(node.children);
          if (node.label.toLowerCase().includes(keyword) || node.key.toLowerCase().includes(keyword) || filteredChildren.length > 0) {
            return { ...node, children: filteredChildren };
          }
          return null;
        })
        .filter(Boolean) as VariableSource[];
    };
    return filterTree(sources);
  }, [sources, searchKeyword]);

  if (!visible) return null;

  const handleSelectVariable = (key: string) => {
    setInputValue(key);
    setBindingType('variable');
  };

  const handleConfirm = () => {
    onChange(inputValue, bindingType);
    onClose();
  };

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
          width: '560px',
          maxHeight: '70vh',
          overflow: 'auto',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>数据绑定</h3>

        {/* 绑定方式切换 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {(['static', 'variable', 'expression'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setBindingType(type)}
              style={{
                padding: '6px 16px',
                border: '1px solid',
                borderColor: bindingType === type ? '#1890ff' : '#d9d9d9',
                borderRadius: '4px',
                backgroundColor: bindingType === type ? '#e6f7ff' : '#fff',
                color: bindingType === type ? '#1890ff' : '#000000d9',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {type === 'static' ? '静态值' : type === 'variable' ? '变量引用' : '表达式'}
            </button>
          ))}
        </div>

        {/* 静态值 */}
        {bindingType === 'static' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px' }}>值</label>
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="输入固定值"
              style={{ width: '100%', padding: '6px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>
        )}

        {/* 变量引用 */}
        {bindingType === 'variable' && (
          <div>
            {/* 搜索 */}
            <input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索变量..."
              style={{ width: '100%', padding: '6px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', marginBottom: '12px', boxSizing: 'border-box' }}
            />

            {/* 变量树 */}
            <div style={{ border: '1px solid #e8e8e8', borderRadius: '4px', maxHeight: '240px', overflow: 'auto', padding: '8px' }}>
              {filteredSources.map((source) => (
                <VariableTreeNode key={source.key} node={source} onSelect={handleSelectVariable} selectedKey={inputValue} />
              ))}
            </div>

            {/* 选中的变量 */}
            {inputValue && (
              <div style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#e6f7ff', borderRadius: '4px', fontSize: '13px' }}>
                已选择: <strong>{inputValue}</strong>
              </div>
            )}
          </div>
        )}

        {/* 表达式 */}
        {bindingType === 'expression' && (
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px' }}>表达式</label>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="如: $context.currentRecord.firstName + ' ' + $context.currentRecord.lastName"
              rows={4}
              style={{ width: '100%', padding: '6px 12px', border: '1px solid #d9d9d9', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px', boxSizing: 'border-box' }}
            />
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              支持引用变量（$context.xxx, $form.xxx）和运算引擎函数
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 24px', border: '1px solid #d9d9d9', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#fff' }}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            style={{ padding: '8px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#1890ff', color: '#fff' }}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

/** 变量树节点 */
function VariableTreeNode({
  node,
  onSelect,
  selectedKey,
}: {
  node: VariableSource;
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
        <span>{node.label}</span>
        <span style={{ color: '#bbb', fontSize: '11px', marginLeft: '4px' }}>{node.key}</span>
      </div>
      {expanded && hasChildren && (
        <div style={{ paddingLeft: '12px' }}>
          {node.children.map((child) => (
            <VariableTreeNode key={child.key} node={child} onSelect={onSelect} selectedKey={selectedKey} />
          ))}
        </div>
      )}
    </div>
  );
}
