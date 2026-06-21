/**
 * TypeMismatchModal — 类型不匹配确认对话框
 *
 * 当变量/表达式的返回类型与属性期望类型不一致时显示，
 * 让用户确认是否继续使用。
 */

import React from 'react';

/** 对话框属性 */
interface TypeMismatchModalProps {
  /** 是否显示 */
  visible: boolean;
  /** 属性期望类型 */
  expectedType: string;
  /** 实际推断类型 */
  actualType: string;
  /** 提示信息 */
  message: string;
  /** 是否包含 Promise 返回 */
  hasPromiseReturn?: boolean;
  /** Promise 返回的详情 */
  promiseLocations?: string[];
  /** 点击继续 */
  onContinue: () => void;
  /** 点击取消 */
  onCancel: () => void;
}

/** 类型名称映射 */
const TYPE_NAMES: Record<string, string> = {
  string: '字符串 (string)',
  number: '数字 (number)',
  boolean: '布尔值 (boolean)',
  object: '对象 (object)',
  array: '数组 (array)',
  null: 'null',
  undefined: 'undefined',
  any: '任意类型',
};

/**
 * 类型不匹配确认对话框
 */
export function TypeMismatchModal(props: TypeMismatchModalProps) {
  const {
    visible,
    expectedType,
    actualType,
    message,
    hasPromiseReturn = false,
    promiseLocations = [],
    onContinue,
    onCancel,
  } = props;

  if (!visible) return null;

  const expectedName = TYPE_NAMES[expectedType] || expectedType;
  const actualName = TYPE_NAMES[actualType] || actualType;

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
        zIndex: 1100, // 高于 VariablePicker 的 1000
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '24px',
          width: '420px',
          maxHeight: '70vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '20px' }}>
            {hasPromiseReturn ? '🚫' : '⚠️'}
          </span>
          <h3 style={{ margin: 0, fontSize: '16px' }}>
            {hasPromiseReturn ? '禁止返回 Promise' : '类型不匹配'}
          </h3>
        </div>

        {/* 内容 */}
        <div style={{ marginBottom: '20px', fontSize: '13px', lineHeight: '1.6' }}>
          {hasPromiseReturn ? (
            <>
              <p style={{ margin: '0 0 12px', color: '#ff4d4f' }}>
                表达式中包含返回 Promise 的调用，这是不允许的。
              </p>
              <p style={{ margin: '0 0 8px', color: '#666' }}>
                属性绑定只支持返回基本数据类型（string、number、boolean、object、array）。
              </p>
              {promiseLocations.length > 0 && (
                <div style={{
                  backgroundColor: '#fff2f0',
                  border: '1px solid #ffccc7',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  marginTop: '8px',
                }}>
                  <div style={{ fontWeight: 500, marginBottom: '4px' }}>检测到以下 Promise 调用：</div>
                  {promiseLocations.map((loc, i) => (
                    <code key={i} style={{
                      display: 'block',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: '#cf1322',
                      padding: '2px 0',
                    }}>
                      {loc}
                    </code>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 12px' }}>
                {message || '变量/表达式的返回类型与属性期望类型不一致。'}
              </p>
              <div style={{
                display: 'flex',
                gap: '12px',
                backgroundColor: '#fafafa',
                borderRadius: '4px',
                padding: '12px',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>属性期望</div>
                  <div style={{
                    fontWeight: 500,
                    color: '#1890ff',
                    fontFamily: 'monospace',
                  }}>
                    {expectedName}
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#999',
                  fontSize: '16px',
                }}>
                  →
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>实际返回</div>
                  <div style={{
                    fontWeight: 500,
                    color: '#fa8c16',
                    fontFamily: 'monospace',
                  }}>
                    {actualName}
                  </div>
                </div>
              </div>
              <p style={{ margin: '12px 0 0', color: '#666', fontSize: '12px' }}>
                继续使用可能导致运行时类型错误。确定要继续吗？
              </p>
            </>
          )}
        </div>

        {/* 按钮 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 24px',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: '#fff',
              fontSize: '13px',
            }}
          >
            {hasPromiseReturn ? '返回修改' : '取消'}
          </button>
          {!hasPromiseReturn && (
            <button
              onClick={onContinue}
              style={{
                padding: '8px 24px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: '#fa8c16',
                color: '#fff',
                fontSize: '13px',
              }}
            >
              继续使用
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export type { TypeMismatchModalProps };
