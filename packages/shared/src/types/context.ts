/** 运行时上下文 — 所有变量引用的数据源 */
export interface RenderContext {
  $context: {
    currentUser: UserInfo;
    /** 当前用户的权限上下文（由 PermissionEngine.buildPermissionContext 生成） */
    permissions?: import('./permission').PermissionContextLike;
    /** 当前运行平台（由运行环境注入） */
    platform?: 'web' | 'mobile';
    currentRecord?: Record<string, any>;
    route: {
      path: string;
      params: Record<string, string>;
      query: Record<string, string>;
    };
    global: Record<string, any>;
  };
  $form: Record<string, any>;
  $api: Record<string, { data: any; loading: boolean; error: Error | null }>;
  $components: Record<string, Record<string, any>>;
  $workflow?: {
    instanceId: string;
    nodeId: string;
    variables: Record<string, any>;
    snapshots: Record<string, any>;
  };
}

export interface UserInfo {
  id: string;
  name: string;
  avatar?: string;
  /** 角色 ID 列表 */
  roles?: string[];
  /** 部门 ID */
  department?: string;
  /** 部门名称 */
  departmentName?: string;
  /** 岗位 ID */
  position?: string;
  [key: string]: any;
}
