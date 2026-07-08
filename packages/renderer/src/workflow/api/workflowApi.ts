/**
 * 流程 API 客户端
 *
 * 封装前端对流程 API 的调用。
 */

const API_BASE = '/api';

/** 请求选项 */
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  params?: Record<string, string>;
}

/**
 * 通用请求函数
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options;

  // 构建 URL
  let url = `${API_BASE}${path}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  // 构建请求选项
  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  // 发送请求
  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const result = await response.json();
  return result.data || result;
}

// ==================== 流程定义 API ====================

/** 流程定义 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  schema: any;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  version: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

/**
 * 获取流程定义列表
 */
export async function getWorkflows(appId: string): Promise<WorkflowDefinition[]> {
  return request<WorkflowDefinition[]>(`/apps/${appId}/workflows`);
}

/**
 * 获取单个流程定义
 */
export async function getWorkflow(appId: string, workflowId: string): Promise<WorkflowDefinition> {
  return request<WorkflowDefinition>(`/apps/${appId}/workflows/${workflowId}`);
}

/**
 * 创建流程定义
 */
export async function createWorkflow(appId: string, data: {
  name: string;
  description?: string;
  schema?: any;
}): Promise<WorkflowDefinition> {
  return request<WorkflowDefinition>(`/apps/${appId}/workflows`, {
    method: 'POST',
    body: data,
  });
}

/**
 * 更新流程定义
 */
export async function updateWorkflow(appId: string, workflowId: string, data: {
  name?: string;
  description?: string;
  schema?: any;
}): Promise<WorkflowDefinition> {
  return request<WorkflowDefinition>(`/apps/${appId}/workflows/${workflowId}`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * 删除流程定义
 */
export async function deleteWorkflow(appId: string, workflowId: string): Promise<void> {
  return request<void>(`/apps/${appId}/workflows/${workflowId}`, {
    method: 'DELETE',
  });
}

/**
 * 发布流程定义
 */
export async function publishWorkflow(appId: string, workflowId: string): Promise<WorkflowDefinition> {
  return request<WorkflowDefinition>(`/apps/${appId}/workflows/${workflowId}/publish`, {
    method: 'POST',
  });
}

/**
 * 触发流程实例
 */
export async function triggerWorkflow(appId: string, workflowId: string, data: {
  sourceTable?: string;
  sourceId?: string;
  variables?: Record<string, any>;
  startedBy?: string;
  startedByName?: string;
}): Promise<WorkflowInstance> {
  return request<WorkflowInstance>(`/apps/${appId}/workflows/${workflowId}/trigger`, {
    method: 'POST',
    body: data,
  });
}

// ==================== 流程实例 API ====================

/** 流程实例 */
export interface WorkflowInstance {
  id: string;
  workflowDefId: string;
  workflowKey: string;
  version: number;
  sourceTable?: string;
  sourceId?: string;
  currentNodeId?: string;
  status: string;
  variables: Record<string, any>;
  startedBy: string;
  startedByName?: string;
  startedAt: string;
  completedAt?: string;
}

/**
 * 获取流程实例列表
 */
export async function getInstances(appId: string, filters?: {
  status?: string;
  workflowId?: string;
  startedBy?: string;
}): Promise<WorkflowInstance[]> {
  return request<WorkflowInstance[]>(`/apps/${appId}/workflow-instances`, {
    params: filters,
  });
}

/**
 * 获取单个流程实例
 */
export async function getInstance(appId: string, instanceId: string): Promise<WorkflowInstance> {
  return request<WorkflowInstance>(`/apps/${appId}/workflow-instances/${instanceId}`);
}

/**
 * 终止流程实例
 */
export async function terminateInstance(appId: string, instanceId: string, reason?: string): Promise<WorkflowInstance> {
  return request<WorkflowInstance>(`/apps/${appId}/workflow-instances/${instanceId}/terminate`, {
    method: 'POST',
    body: { reason },
  });
}

/**
 * 获取流程实例历史
 */
export async function getInstanceHistory(appId: string, instanceId: string): Promise<{
  instance: WorkflowInstance;
  snapshots: any[];
}> {
  return request(`/apps/${appId}/workflow-instances/${instanceId}/history`);
}

// ==================== 审批任务 API ====================

/** 审批任务 */
export interface ApprovalTask {
  id: string;
  instanceId: string;
  nodeId: string;
  nodeName?: string;
  assigneeId?: string;
  assigneeName?: string;
  candidateUsers?: string[];
  candidateGroups?: string[];
  status: string;
  formData?: Record<string, any>;
  comment?: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
}

/**
 * 获取任务列表
 */
export async function getTasks(appId: string, filters?: {
  instanceId?: string;
  assigneeId?: string;
  status?: string;
}): Promise<ApprovalTask[]> {
  return request<ApprovalTask[]>(`/apps/${appId}/workflow-tasks`, {
    params: filters,
  });
}

/**
 * 获取单个任务
 */
export async function getTask(appId: string, taskId: string): Promise<ApprovalTask> {
  return request<ApprovalTask>(`/apps/${appId}/workflow-tasks/${taskId}`);
}

/**
 * 审批通过
 */
export async function approveTask(appId: string, taskId: string, data: {
  formData?: Record<string, any>;
  comment?: string;
  operatorId?: string;
  operatorName?: string;
}): Promise<any> {
  return request(`/apps/${appId}/workflow-tasks/${taskId}/approve`, {
    method: 'POST',
    body: data,
  });
}

/**
 * 审批驳回
 */
export async function rejectTask(appId: string, taskId: string, data: {
  comment: string;
  operatorId?: string;
  operatorName?: string;
  targetNodeId?: string;
}): Promise<any> {
  return request(`/apps/${appId}/workflow-tasks/${taskId}/reject`, {
    method: 'POST',
    body: data,
  });
}

/**
 * 转办任务
 */
export async function transferTask(appId: string, taskId: string, data: {
  targetUserId: string;
  targetUserName?: string;
  operatorId?: string;
  operatorName?: string;
  reason?: string;
}): Promise<any> {
  return request(`/apps/${appId}/workflow-tasks/${taskId}/transfer`, {
    method: 'POST',
    body: data,
  });
}
