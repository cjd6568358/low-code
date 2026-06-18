import React, { useMemo, useCallback } from 'react';
import type { JSONSchema7 } from '@low-code/shared';
import { controlRegistry, type ControlProps } from './ControlRegistry';
import type { DictionaryService } from '@low-code/shared';
import type { ExpressionEngine } from '@low-code/shared';

/** AutoForm 渲染器属性 */
export interface AutoFormRendererProps {
  schema: JSONSchema7;
  value?: Record<string, any>;
  onChange?: (value: Record<string, any>) => void;
  layoutMode?: 'tabs' | 'groups' | 'steps' | 'sections';
  controls?: Record<string, React.ComponentType<ControlProps>>;
  dictionaryService?: DictionaryService;
  variableSources?: any;
  errors?: Record<string, string[]>;
  readOnly?: boolean;
  expressionEngine?: ExpressionEngine;
}

/**
 * 自动表单渲染器
 * 读取 JSON Schema，自动渲染为配置表单
 */
export function AutoFormRenderer(props: AutoFormRendererProps) {
  const {
    schema,
    value = {},
    onChange,
    layoutMode: propLayoutMode,
    controls,
    dictionaryService,
    errors,
    readOnly,
    expressionEngine,
  } = props;

  // 注册额外控件
  useMemo(() => {
    if (controls) {
      for (const [name, component] of Object.entries(controls)) {
        controlRegistry.registerControl(name, component);
      }
    }
  }, [controls]);

  // 布局模式
  const layoutMode = propLayoutMode || (schema as any)['x-layout-mode'] || 'groups';

  // 按 x-group 分组字段
  const fieldGroups = useMemo(() => {
    const groups = new Map<string, Array<{ key: string; schema: JSONSchema7 }>>();

    if (!schema.properties) return groups;

    for (const [key, fieldSchema] of Object.entries(schema.properties)) {
      if ((fieldSchema as any)['x-hidden']) continue;

      const group = (fieldSchema as any)['x-group'] || '基础属性';
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push({ key, schema: fieldSchema as JSONSchema7 });
    }

    // 按 x-priority 排序
    for (const [, fields] of groups) {
      fields.sort((a, b) => {
        const priorityA = (a.schema as any)['x-priority'] ?? 999;
        const priorityB = (b.schema as any)['x-priority'] ?? 999;
        return priorityA - priorityB;
      });
    }

    return groups;
  }, [schema]);

  // 字段值变更处理
  const handleFieldChange = useCallback(
    (field: string, fieldValue: any) => {
      if (readOnly) return;
      onChange?.({ ...value, [field]: fieldValue });
    },
    [value, onChange, readOnly],
  );

  // 渲染单个字段
  const renderField = useCallback(
    (key: string, fieldSchema: JSONSchema7) => {
      // 条件显隐
      const visibleExpr = (fieldSchema as any)['x-visible'];
      if (visibleExpr && expressionEngine) {
        const visible = expressionEngine.safeEvaluate(visibleExpr, value);
        if (!visible) return null;
      }

      // 解析控件
      const xComponent = (fieldSchema as any)['x-component'];
      const componentProps = (fieldSchema as any)['x-component-props'] || {};
      // enum 字段优先用 Select 控件
      const resolvedType = fieldSchema.enum ? 'enum' : (fieldSchema.type as string || 'string');
      const ControlComponent = controlRegistry.resolve(
        resolvedType,
        fieldSchema.format,
        xComponent,
      );

      if (!ControlComponent) {
        return (
          <div key={key} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              {fieldSchema.title || key}
            </label>
            <div style={{ color: '#999', fontSize: '12px' }}>
              未找到控件: {xComponent || fieldSchema.type}
            </div>
          </div>
        );
      }

      const isDisabled = readOnly || (fieldSchema as any)['x-disabled'];
      const placeholder = (fieldSchema as any)['x-placeholder'] || '';
      const fieldErrors = errors?.[key];

      return (
        <div key={key} style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '4px',
              fontWeight: 500,
              fontSize: '14px',
            }}
          >
            {fieldSchema.title || key}
            {schema.required?.includes(key) && (
              <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>
            )}
          </label>
          {fieldSchema.description && (
            <div style={{ color: '#999', fontSize: '12px', marginBottom: '4px' }}>
              {fieldSchema.description}
            </div>
          )}
          <ControlComponent
            value={value[key]}
            onChange={(v: any) => handleFieldChange(key, v)}
            schema={fieldSchema}
            disabled={isDisabled}
            placeholder={placeholder}
            errors={fieldErrors}
            dictionaryService={dictionaryService}
            expressionEngine={expressionEngine}
            {...componentProps}
          />
          {fieldErrors && fieldErrors.length > 0 && (
            <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
              {fieldErrors[0]}
            </div>
          )}
        </div>
      );
    },
    [value, schema.required, errors, readOnly, handleFieldChange, dictionaryService, expressionEngine],
  );

  // 渲染字段组
  const renderGroup = useCallback(
    (groupName: string, fields: Array<{ key: string; schema: JSONSchema7 }>) => {
      return (
        <div key={groupName} style={{ marginBottom: '24px' }}>
          <h4
            style={{
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '1px solid #e8e8e8',
            }}
          >
            {groupName}
          </h4>
          {fields.map(({ key, schema: fieldSchema }) => renderField(key, fieldSchema))}
        </div>
      );
    },
    [renderField],
  );

  // 根据布局模式渲染
  const renderContent = () => {
    const groups = Array.from(fieldGroups.entries());

    switch (layoutMode) {
      case 'tabs':
        return <TabsLayout groups={groups} renderGroup={renderGroup} />;
      case 'steps':
        return <StepsLayout groups={groups} renderGroup={renderGroup} />;
      case 'sections':
        return (
          <div>
            {groups.map(([name, fields]) => renderGroup(name, fields))}
          </div>
        );
      case 'groups':
      default:
        return <GroupsLayout groups={groups} renderGroup={renderGroup} />;
    }
  };

  return (
    <div className="lc-auto-form" style={{ maxWidth: '800px' }}>
      {renderContent()}
    </div>
  );
}

// ========== 布局组件 ==========

/** 折叠分组布局 */
function GroupsLayout({
  groups,
  renderGroup,
}: {
  groups: Array<[string, Array<{ key: string; schema: JSONSchema7 }>]>;
  renderGroup: (name: string, fields: Array<{ key: string; schema: JSONSchema7 }>) => React.ReactNode;
}) {
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(
    new Set(groups.map(([name]) => name)),
  );

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  return (
    <div>
      {groups.map(([name, fields]) => (
        <div key={name} style={{ marginBottom: '8px', border: '1px solid #e8e8e8', borderRadius: '6px' }}>
          <div
            onClick={() => toggleGroup(name)}
            style={{
              padding: '12px 16px',
              cursor: 'pointer',
              backgroundColor: '#fafafa',
              borderRadius: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '14px' }}>{name}</span>
            <span>{expandedGroups.has(name) ? '▼' : '▶'}</span>
          </div>
          {expandedGroups.has(name) && (
            <div style={{ padding: '16px' }}>
              {renderGroup(name, fields)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** 标签页布局 */
function TabsLayout({
  groups,
  renderGroup,
}: {
  groups: Array<[string, Array<{ key: string; schema: JSONSchema7 }>]>;
  renderGroup: (name: string, fields: Array<{ key: string; schema: JSONSchema7 }>) => React.ReactNode;
}) {
  const [activeTab, setActiveTab] = React.useState(groups[0]?.[0] || '');

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '1px solid #e8e8e8', marginBottom: '16px' }}>
        {groups.map(([name]) => (
          <div
            key={name}
            onClick={() => setActiveTab(name)}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              borderBottom: activeTab === name ? '2px solid #1890ff' : '2px solid transparent',
              color: activeTab === name ? '#1890ff' : '#000000d9',
              fontWeight: activeTab === name ? 600 : 400,
            }}
          >
            {name}
          </div>
        ))}
      </div>
      {groups.map(([name, fields]) =>
        activeTab === name ? (
          <div key={name}>{renderGroup(name, fields)}</div>
        ) : null,
      )}
    </div>
  );
}

/** 分步表单布局 */
function StepsLayout({
  groups,
  renderGroup,
}: {
  groups: Array<[string, Array<{ key: string; schema: JSONSchema7 }>]>;
  renderGroup: (name: string, fields: Array<{ key: string; schema: JSONSchema7 }>) => React.ReactNode;
}) {
  const [currentStep, setCurrentStep] = React.useState(0);

  return (
    <div>
      <div style={{ display: 'flex', marginBottom: '24px' }}>
        {groups.map(([name], index) => (
          <div
            key={name}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '8px',
              backgroundColor: index <= currentStep ? '#1890ff' : '#f0f0f0',
              color: index <= currentStep ? '#fff' : '#000000d9',
              borderRadius: '4px',
              marginRight: index < groups.length - 1 ? '8px' : 0,
              cursor: 'pointer',
            }}
            onClick={() => setCurrentStep(index)}
          >
            {index + 1}. {name}
          </div>
        ))}
      </div>
      {groups.map(([name, fields], index) =>
        index === currentStep ? (
          <div key={name}>{renderGroup(name, fields)}</div>
        ) : null,
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
        <button
          disabled={currentStep === 0}
          onClick={() => setCurrentStep((s) => s - 1)}
          style={{
            padding: '8px 16px',
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          上一步
        </button>
        <button
          disabled={currentStep === groups.length - 1}
          onClick={() => setCurrentStep((s) => s + 1)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1890ff',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: currentStep === groups.length - 1 ? 'not-allowed' : 'pointer',
          }}
        >
          下一步
        </button>
      </div>
    </div>
  );
}
