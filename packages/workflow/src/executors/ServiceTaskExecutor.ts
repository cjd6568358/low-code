/**
 * 服务任务执行器
 *
 * 支持两种配置模式：
 * 1. 表达式模式（设计器输出）：读取节点顶层 expression 字段，通过表达式引擎执行
 * 2. 服务配置模式（扩展字段）：读取 extensionElements.serviceConfig，按 serviceType 分发
 */

import type { FlowNode } from '../schema';
import { NodeExecutorBase } from './NodeExecutorBase';
import type { ExecutionContext, ExecutionResult } from '../types/execution';
import { ConditionExpressionEvaluator } from '../engine/ExpressionEvaluator';

/** 服务任务配置（扩展模式） */
interface ServiceTaskExtensionConfig {
  /** 服务类型 */
  serviceType: 'api' | 'database' | 'email' | 'webhook' | 'custom';
  /** API 配置 */
  apiConfig?: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
    timeout?: number;
  };
  /** 数据库配置 */
  databaseConfig?: {
    operation: 'insert' | 'update' | 'delete' | 'query';
    table: string;
    data?: Record<string, unknown>;
    conditions?: Record<string, unknown>;
  };
  /** 邮件配置 */
  emailConfig?: {
    to: string[];
    subject: string;
    body: string;
    attachments?: string[];
  };
  /** Webhook 配置 */
  webhookConfig?: {
    url: string;
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  };
  /** 自定义配置 */
  customConfig?: {
    handler: string;
    params?: Record<string, unknown>;
  };
  /** 重试配置 */
  retryConfig?: {
    maxRetries: number;
    retryInterval: number;
    backoffMultiplier?: number;
  };
  /** 超时配置 */
  timeout?: number;
}

/**
 * 服务任务执行器
 */
export class ServiceTaskExecutor extends NodeExecutorBase {
  private readonly evaluator = new ConditionExpressionEvaluator();

  /**
   * 执行服务任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { currentNode, instance, variables } = context;

    // 更新当前节点
    await this.engine['updateInstance'](instance.id, {
      currentNodeId: currentNode.id,
    });

    // 优先检查表达式模式（设计器输出）
    const expression = (currentNode as any).expression;
    if (expression) {
      return this.executeExpression(context, expression);
    }

    // 回退到扩展配置模式
    const serviceConfig = this.getExtensionConfig(currentNode);
    if (serviceConfig.serviceType) {
      return this.executeExtensionConfig(context, serviceConfig);
    }

    return this.createErrorResult('服务任务未配置执行内容');
  }

  /**
   * 执行表达式模式（设计器保存的 expression 字段）
   */
  private async executeExpression(
    context: ExecutionContext,
    expression: string
  ): Promise<ExecutionResult> {
    const { instance, variables, currentNode } = context;

    try {
      // 使用表达式引擎执行（支持 async 上下文）
      const result = this.evaluator.evaluate(expression, {
        variables,
        currentNodeId: currentNode.id,
      });

      // 如果结果是 Promise，等待完成
      const resolvedResult = result instanceof Promise ? await result : result;

      // 合并结果到流程变量
      if (resolvedResult !== undefined && resolvedResult !== null) {
        const variableUpdates: Record<string, unknown> =
          typeof resolvedResult === 'object' && !Array.isArray(resolvedResult)
            ? resolvedResult as Record<string, unknown>
            : { [currentNode.id]: resolvedResult };

        await this.engine['mergeVariables'](instance.id, variableUpdates);

        const nextNodes = this.getNextNodes(context);
        return {
          success: true,
          nextNodes,
          variableUpdates,
        };
      }

      const nextNodes = this.getNextNodes(context);
      return this.createSuccessResult(nextNodes);
    } catch (error) {
      return this.createErrorResult(
        `服务表达式执行失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 执行扩展配置模式（extensionElements.serviceConfig）
   */
  private async executeExtensionConfig(
    context: ExecutionContext,
    serviceConfig: ServiceTaskExtensionConfig
  ): Promise<ExecutionResult> {
    const { instance, variables, currentNode } = context;

    const result = await this.executeService(serviceConfig, variables);

    if (!result.success) {
      return this.createErrorResult(result.error || '服务执行失败');
    }

    // 合并结果到变量
    if (result.data) {
      await this.engine['mergeVariables'](instance.id, result.data);
    }

    const nextNodes = this.getNextNodes(context);
    return this.createSuccessResult(nextNodes);
  }

  /**
   * 获取扩展配置（extensionElements.serviceConfig）
   */
  private getExtensionConfig(node: FlowNode): ServiceTaskExtensionConfig {
    const extension = node.extensionElements as any;
    return extension?.serviceConfig || {};
  }

  /**
   * 执行服务
   */
  private async executeService(
    config: ServiceTaskExtensionConfig,
    variables: Record<string, unknown>
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      switch (config.serviceType) {
        case 'api':
          return await this.executeApiCall(config.apiConfig!, variables);
        case 'database':
          return await this.executeDatabaseOperation(config.databaseConfig!, variables);
        case 'email':
          return await this.executeEmail(config.emailConfig!, variables);
        case 'webhook':
          return await this.executeWebhook(config.webhookConfig!, variables);
        case 'custom':
          return await this.executeCustomHandler(config.customConfig!, variables);
        default:
          return { success: false, error: `不支持的服务类型: ${config.serviceType}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '服务执行失败',
      };
    }
  }

  /**
   * 执行 API 调用
   */
  private async executeApiCall(
    config: ServiceTaskExtensionConfig['apiConfig'],
    variables: Record<string, unknown>
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    if (!config) {
      return { success: false, error: 'API 配置为空' };
    }

    try {
      // 解析 URL 中的变量
      const url = this.resolveVariables(config.url, variables);

      // 解析请求体中的变量
      const body = config.body ? this.resolveVariables(JSON.stringify(config.body), variables) : undefined;

      // 发送请求
      const response = await fetch(url, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: body ? JSON.parse(body) : undefined,
        signal: config.timeout ? AbortSignal.timeout(config.timeout) : undefined,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `API 调用失败: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API 调用失败',
      };
    }
  }

  /**
   * 执行数据库操作
   */
  private async executeDatabaseOperation(
    config: ServiceTaskExtensionConfig['databaseConfig'],
    variables: Record<string, unknown>
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    if (!config) {
      return { success: false, error: '数据库配置为空' };
    }

    // 这里应该调用实际的数据库服务
    // 简化处理，返回模拟结果
    return {
      success: true,
      data: {
        affectedRows: 1,
        operation: config.operation,
        table: config.table,
      },
    };
  }

  /**
   * 执行邮件发送
   */
  private async executeEmail(
    config: ServiceTaskExtensionConfig['emailConfig'],
    variables: Record<string, unknown>
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    if (!config) {
      return { success: false, error: '邮件配置为空' };
    }

    // 这里应该调用实际的邮件服务
    // 简化处理，返回模拟结果
    return {
      success: true,
      data: {
        sent: true,
        to: config.to,
        subject: this.resolveVariables(config.subject, variables),
      },
    };
  }

  /**
   * 执行 Webhook
   */
  private async executeWebhook(
    config: ServiceTaskExtensionConfig['webhookConfig'],
    variables: Record<string, unknown>
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    if (!config) {
      return { success: false, error: 'Webhook 配置为空' };
    }

    try {
      const url = this.resolveVariables(config.url, variables);
      const body = config.body ? this.resolveVariables(JSON.stringify(config.body), variables) : undefined;

      const response = await fetch(url, {
        method: config.method,
        headers: config.headers,
        body: body ? JSON.parse(body) : undefined,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Webhook 调用失败: ${response.status}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook 调用失败',
      };
    }
  }

  /**
   * 执行自定义处理器
   */
  private async executeCustomHandler(
    config: ServiceTaskExtensionConfig['customConfig'],
    variables: Record<string, unknown>
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    if (!config) {
      return { success: false, error: '自定义配置为空' };
    }

    // 这里应该调用实际的自定义处理器
    // 简化处理，返回模拟结果
    return {
      success: true,
      data: {
        handler: config.handler,
        params: config.params,
      },
    };
  }

  /**
   * 解析变量
   */
  private resolveVariables(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\$\{([^}]+)\}/g, (match, varPath) => {
      const value = this.getNestedValue(variables, varPath.trim());
      return String(value ?? match);
    });
  }

  /**
   * 获取嵌套对象的值
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * 获取节点配置
   */
  getNodeConfig(node: FlowNode) {
    const extensionConfig = this.getExtensionConfig(node);
    const expression = (node as any).expression;

    return {
      type: 'bpmn:ServiceTask',
      waitForInput: false,
      timeout: extensionConfig.timeout,
      retryCount: expression ? 0 : extensionConfig.retryConfig?.maxRetries,
      retryInterval: expression ? 0 : extensionConfig.retryConfig?.retryInterval,
    };
  }
}
