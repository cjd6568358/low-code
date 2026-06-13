import React from 'react';
import type { JSONSchema7 } from '@low-code/shared';

/** 控件属性接口 */
export interface ControlProps {
  value: any;
  onChange: (value: any) => void;
  schema: JSONSchema7;
  disabled?: boolean;
  placeholder?: string;
  errors?: string[];
  onOpenVariablePicker?: () => void;
  dictionaryService?: any;
  expressionEngine?: any;
}

/** 判别联合配置 */
export interface DiscriminatorConfig {
  field: string;
  mapping: Record<string, JSONSchema7>;
}

/**
 * 控件注册表
 * 管理类型/格式/自定义控件到 React 组件的映射
 */
export class ControlRegistryImpl {
  /** 类型+格式 → 控件映射 */
  private typeControls = new Map<string, React.ComponentType<ControlProps>>();

  /** 自定义控件名 → 控件映射 */
  private namedControls = new Map<string, React.ComponentType<ControlProps>>();

  /** 判别联合配置 */
  private discriminators = new Map<string, DiscriminatorConfig>();

  /**
   * 注册类型控件
   */
  register(
    type: string,
    format: string | null,
    component: React.ComponentType<ControlProps>,
  ): void {
    const key = format ? `${type}:${format}` : type;
    this.typeControls.set(key, component);
  }

  /**
   * 注册命名控件（通过 x-component 引用）
   */
  registerControl(
    name: string,
    component: React.ComponentType<ControlProps>,
  ): void {
    this.namedControls.set(name, component);
  }

  /**
   * 注册判别联合
   */
  registerDiscriminator(
    schemaId: string,
    config: DiscriminatorConfig,
  ): void {
    this.discriminators.set(schemaId, config);
  }

  /**
   * 解析控件
   * 优先级: x-component > type+format > type
   */
  resolve(
    type: string,
    format?: string,
    xComponent?: string,
  ): React.ComponentType<ControlProps> | null {
    // 1. 优先使用 x-component 指定的命名控件
    if (xComponent) {
      const named = this.namedControls.get(xComponent);
      if (named) return named;
    }

    // 2. 尝试 type+format
    if (format) {
      const withFormat = this.typeControls.get(`${type}:${format}`);
      if (withFormat) return withFormat;
    }

    // 3. 尝试 type
    return this.typeControls.get(type) || null;
  }

  /**
   * 获取判别联合配置
   */
  getDiscriminator(schemaId: string): DiscriminatorConfig | null {
    return this.discriminators.get(schemaId) || null;
  }

  /**
   * 列出所有注册的控件
   */
  list(): Array<{ name: string; type: 'type' | 'named' }> {
    const result: Array<{ name: string; type: 'type' | 'named' }> = [];
    for (const name of this.typeControls.keys()) {
      result.push({ name, type: 'type' });
    }
    for (const name of this.namedControls.keys()) {
      result.push({ name, type: 'named' });
    }
    return result;
  }
}

export const controlRegistry = new ControlRegistryImpl();
