import React, { useState } from 'react';
import type { PageRule } from '@low-code/shared';

/** 条件构建器属性 */
export interface ConditionBuilderProps {
  rules: PageRule[];
  onChange: (rules: PageRule[]) => void;
  componentIds: string[];
}

/**
 * 条件规则可视化配置
 *
 * 文档描述：
 * "支持配置显隐规则控制组件展示，支持条件赋值联动（多条件分支赋值、变量取值、表达式计算）"
 *
 * PageRule：
 * - id: 规则 ID
 * - targetId: 目标组件 ID
 * - condition: 条件表达式
 * - action: visible/hidden/disabled/enabled/setValue/setProp
 * - value: 动作值
 * - priority: 优先级
 */
export function ConditionBuilder(props: ConditionBuilderProps) {
  const { rules, onChange, componentIds } = props;

  // 添加规则
  const handleAddRule = () => {
    const newRule: PageRule = {
      id: `rule_${Date.now()}`,
      targetId: componentIds[0] || '',
      condition: '',
      action: 'visible',
      priority: rules.length + 1,
    };
    onChange([...rules, newRule]);
  };

  // 更新规则
  const handleUpdateRule = (index: number, changes: Partial<PageRule>) => {
    const next = rules.map((rule, i) =>
      i === index ? { ...rule, ...changes } : rule,
    );
    onChange(next);
  };

  // 删除规则
  const handleDeleteRule = (index: number) => {
    onChange(rules.filter((_, i) => i !== index));
  };

  // 移动规则优先级
  const handleMoveRule = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= rules.length) return;
    const next = [...rules];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    // 更新优先级
    next.forEach((rule, i) => { rule.priority = i + 1; });
    onChange(next);
  };

  return (
    <div style={{ fontSize: '13px' }}>
      {rules.length === 0 && (
        <div style={{ color: '#999', textAlign: 'center', padding: '16px' }}>
          暂无条件规则
        </div>
      )}

      {rules.map((rule, index) => (
        <div
          key={rule.id}
          style={{
            padding: '12px',
            border: '1px solid #e8e8e8',
            borderRadius: '6px',
            marginBottom: '8px',
            backgroundColor: '#fff',
          }}
        >
          {/* 规则头 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '12px', color: '#666' }}>
              规则 #{index + 1}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => handleMoveRule(index, 'up')}
                disabled={index === 0}
                style={{ padding: '2px 6px', border: '1px solid #d9d9d9', borderRadius: '3px', cursor: index === 0 ? 'not-allowed' : 'pointer', backgroundColor: '#fff', fontSize: '11px' }}
              >
                ↑
              </button>
              <button
                onClick={() => handleMoveRule(index, 'down')}
                disabled={index === rules.length - 1}
                style={{ padding: '2px 6px', border: '1px solid #d9d9d9', borderRadius: '3px', cursor: index === rules.length - 1 ? 'not-allowed' : 'pointer', backgroundColor: '#fff', fontSize: '11px' }}
              >
                ↓
              </button>
              <button
                onClick={() => handleDeleteRule(index)}
                style={{ padding: '2px 6px', border: '1px solid #ff4d4f', borderRadius: '3px', color: '#ff4d4f', cursor: 'pointer', backgroundColor: '#fff', fontSize: '11px' }}
              >
                删除
              </button>
            </div>
          </div>

          {/* 目标组件 */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '2px' }}>目标组件</label>
            <select
              value={rule.targetId}
              onChange={(e) => handleUpdateRule(index, { targetId: e.target.value })}
              style={{ width: '100%', padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
            >
              <option value="">请选择</option>
              {componentIds.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>

          {/* 条件表达式 */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '2px' }}>条件表达式</label>
            <input
              value={rule.condition}
              onChange={(e) => handleUpdateRule(index, { condition: e.target.value })}
              placeholder="如: $user.roles.includes('admin')"
              style={{ width: '100%', padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>

          {/* 动作类型 */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '2px' }}>动作</label>
              <select
                value={rule.action}
                onChange={(e) => handleUpdateRule(index, { action: e.target.value as PageRule['action'] })}
                style={{ width: '100%', padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              >
                <option value="visible">显示</option>
                <option value="hidden">隐藏</option>
                <option value="enabled">启用</option>
                <option value="disabled">禁用</option>
                <option value="setValue">设置值</option>
                <option value="setProp">设置属性</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '2px' }}>优先级</label>
              <input
                type="number"
                value={rule.priority ?? 0}
                onChange={(e) => handleUpdateRule(index, { priority: Number(e.target.value) })}
                style={{ width: '100%', padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* 动作值（setValue/setProp 时显示） */}
          {(rule.action === 'setValue' || rule.action === 'setProp') && (
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '2px' }}>
                {rule.action === 'setValue' ? '值' : '属性 (JSON)'}
              </label>
              <textarea
                value={typeof rule.value === 'string' ? rule.value : JSON.stringify(rule.value, null, 2) ?? ''}
                onChange={(e) => {
                  try {
                    handleUpdateRule(index, { value: JSON.parse(e.target.value) });
                  } catch {
                    handleUpdateRule(index, { value: e.target.value });
                  }
                }}
                rows={2}
                style={{ width: '100%', padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px', boxSizing: 'border-box', fontFamily: 'monospace' }}
              />
            </div>
          )}
        </div>
      ))}

      <button
        onClick={handleAddRule}
        style={{
          padding: '6px 12px',
          border: '1px dashed #1890ff',
          borderRadius: '4px',
          cursor: 'pointer',
          backgroundColor: '#e6f7ff',
          color: '#1890ff',
          width: '100%',
        }}
      >
        + 添加条件规则
      </button>
    </div>
  );
}
