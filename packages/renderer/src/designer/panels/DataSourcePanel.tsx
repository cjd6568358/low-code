/**
 * DataSourcePanel — 页面数据源配置面板
 *
 * 单个表达式编辑器，表达式执行结果赋给 $data。
 * 多个请求用 Promise.all() 在表达式内部处理。
 *
 * 示例：
 * - 单个请求：await $fetch.get("/api/users")
 * - 多个请求：await Promise.all([$fetch.get("/api/users"), $fetch.get("/api/orders")])
 * - 服务端查询：await $table.user.filter(u => u.active).execute()
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { environmentRegistry } from '../../core/EnvironmentRegistry';
import { ExpressionEditor } from '../../components/ExpressionEditor';

/** 数据源配置面板属性 */
export interface DataSourcePanelProps {
  /** 数据源表达式（undefined 表示未配置） */
  expression: string | undefined;
  onChange: (expression: string | undefined) => void;
  /** 页面组件列表（用于 $component 代码提示） */
  pageComponents?: Record<string, { type: string; label?: string }>;
  /** 已配置的数据源列表（用于 $data 代码提示） */
  pageDataSources?: Record<string, { type: string; description?: string }>;
}

/** 页面数据源配置面板（单表达式模式） */
export function DataSourcePanel({
  expression,
  onChange,
  pageComponents = {},
  pageDataSources = {},
}: DataSourcePanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  // 注册页面组件到环境变量（用于代码提示）
  const pageComponentsRef = useRef(pageComponents);
  pageComponentsRef.current = pageComponents;

  useEffect(() => {
    if (Object.keys(pageComponentsRef.current).length > 0) {
      environmentRegistry.registerPageComponents(pageComponentsRef.current);
    }
  }, []);

  const handleChange = useCallback(
    (val: { type: 'variable' | 'expression'; value: string }) => {
      onChange(val.value || undefined);
      setPickerOpen(false);
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    onChange(undefined);
    setPickerOpen(false);
  }, [onChange]);

  return (
    <div style={{ fontSize: 13 }}>
      {/* 表达式展示/编辑触发 */}
      <div
        onClick={() => setPickerOpen(true)}
        style={{
          padding: '8px 10px',
          border: '1px solid #d9d9d9',
          borderRadius: 4,
          cursor: 'pointer',
          backgroundColor: '#fafafa',
          minHeight: 36,
          fontFamily: 'monospace',
          fontSize: 12,
          color: expression ? '#1890ff' : '#999',
          wordBreak: 'break-all',
        }}
      >
        {expression || '点击配置数据源表达式...'}
      </div>

      <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
        表达式结果赋给 <code>$data</code>，多个请求用 <code>Promise.all()</code>
      </div>

      {/* 表达式选择器弹窗 */}
      <ExpressionEditor
        visible={pickerOpen}
        value={expression || ''}
        onChange={handleChange}
        onClear={handleClear}
        onClose={() => setPickerOpen(false)}
        pageComponents={pageComponents}
        pageDataSources={pageDataSources}
      />
    </div>
  );
}
