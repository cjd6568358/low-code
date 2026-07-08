/**
 * 选人组件类型定义
 */

/** 用户信息 */
export interface UserInfo {
  /** 用户ID */
  userId: string;
  /** 用户名 */
  name: string;
  /** 头像 */
  avatar?: string;
  /** 邮箱 */
  email?: string;
  /** 手机号 */
  phone?: string;
  /** 部门信息 */
  departments?: UserDepartment[];
}

/** 用户部门岗位信息 */
export interface UserDepartment {
  /** 部门ID */
  deptId: string;
  /** 部门名称 */
  deptName: string;
  /** 岗位ID */
  positionId?: string;
  /** 岗位名称 */
  positionName?: string;
  /** 是否主部门 */
  isPrimary: boolean;
}

/** 部门树节点 */
export interface DepartmentNode {
  /** 部门ID */
  deptId: string;
  /** 部门名称 */
  name: string;
  /** 父部门ID */
  parentId?: string;
  /** 子部门 */
  children?: DepartmentNode[];
  /** 部门下用户数 */
  userCount?: number;
}

/** 岗位信息 */
export interface PositionInfo {
  /** 岗位ID */
  positionId: string;
  /** 岗位名称 */
  name: string;
  /** 岗位类别 */
  category: 'management' | 'technical' | 'business' | 'support';
  /** 岗位级别 */
  level: number;
}

/** 角色信息 */
export interface RoleInfo {
  /** 角色ID */
  roleId: string;
  /** 角色名称 */
  name: string;
  /** 角色描述 */
  description?: string;
  /** 角色层级 */
  level: 'platform' | 'tenant' | 'app' | 'business';
}

/** 选人组件属性 */
export interface UserSelectorProps {
  /** 当前值（用户ID 或 ID数组） */
  value?: string | string[];
  /** 值变更回调 */
  onChange?: (value: string | string[]) => void;
  /** 选择模式 */
  mode?: 'single' | 'multiple';
  /** 筛选条件 */
  filters?: {
    /** 限定部门范围 */
    departments?: string[];
    /** 限定角色范围 */
    roles?: string[];
    /** 限定岗位类别 */
    positionCategories?: string[];
  };
  /** 占位文本 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 租户ID */
  tenantId: string;
  /** 最大选择数量（多选模式） */
  maxCount?: number;
}

/** 选人弹窗属性 */
export interface UserSelectorModalProps {
  /** 是否可见 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 确认回调 */
  onConfirm: (selectedUsers: UserInfo[]) => void;
  /** 已选用户 */
  selectedUsers?: UserInfo[];
  /** 选择模式 */
  mode?: 'single' | 'multiple';
  /** 筛选条件 */
  filters?: UserSelectorProps['filters'];
  /** 租户ID */
  tenantId: string;
  /** 最大选择数量 */
  maxCount?: number;
}
