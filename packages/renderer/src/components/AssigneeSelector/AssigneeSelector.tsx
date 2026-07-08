/**
 * 审批人指派选择器
 *
 * 支持按用户/角色/部门/岗位四种维度指派审批人。
 * 设计时存储策略描述，运行时由引擎动态解析为具体用户。
 *
 * 使用方式：
 * - Tab 切换四种指派模式
 * - 选中后显示为 Tag
 * - 返回 AssigneeStrategy 对象供引擎运行时解析
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Tag, Space, Modal, Tree, Checkbox, List, Avatar, Input, Spin, Empty, Tabs } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  ApartmentOutlined,
  SafetyCertificateOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type {
  AssigneeSelectorProps,
  AssigneeStrategy,
  AssigneeStrategyType,
  AssigneeUserInfo,
  AssigneeRoleInfo,
  AssigneeDeptInfo,
  AssigneePositionInfo,
} from './types';

const { Search } = Input;

/** Tab 标签映射 */
const TAB_LABELS: Record<AssigneeStrategyType, string> = {
  user: '指定人员',
  role: '按角色',
  department: '按部门',
  position: '按岗位',
};

/** Tab 图标映射 */
const TAB_ICONS: Record<AssigneeStrategyType, React.ReactNode> = {
  user: <UserOutlined />,
  role: <SafetyCertificateOutlined />,
  department: <ApartmentOutlined />,
  position: <TeamOutlined />,
};

/**
 * 审批人指派选择器
 */
export const AssigneeSelector: React.FC<AssigneeSelectorProps> = ({
  value,
  onChange,
  placeholder = '设置审批人',
  disabled = false,
  tenantId,
}) => {
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<AssigneeStrategyType>(value?.type || 'user');

  // 各维度数据
  const [users, setUsers] = useState<AssigneeUserInfo[]>([]);
  const [roles, setRoles] = useState<AssigneeRoleInfo[]>([]);
  const [departments, setDepartments] = useState<AssigneeDeptInfo[]>([]);
  const [positions, setPositions] = useState<AssigneePositionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  // 当前选中项（临时状态，确认后才写入 value）
  const [tempStrategy, setTempStrategy] = useState<AssigneeStrategy | undefined>(value);

  // 已选项目的详细信息（用于 Tag 展示）
  const [selectedDetails, setSelectedDetails] = useState<Array<{ id: string; name: string }>>([]);

  // 基础引用数据（部门/角色/岗位）挂载时即加载，用于 Tag 回显
  useEffect(() => {
    const loadBaseData = async () => {
      try {
        const [rolesRes, deptsRes, positionsRes] = await Promise.all([
          fetch(`/api/tenants/${tenantId}/roles`).then(r => r.json()),
          fetch(`/api/tenants/${tenantId}/departments`).then(r => r.json()),
          fetch(`/api/tenants/${tenantId}/positions`).then(r => r.json()),
        ]);

        if (rolesRes.success) setRoles(rolesRes.data || []);
        if (deptsRes.success) setDepartments(deptsRes.data || []);
        if (positionsRes.success) setPositions(positionsRes.data || []);
      } catch (err) {
        console.error('加载引用数据失败:', err);
      }
    };

    loadBaseData();
  }, [tenantId]);

  // 用户列表仅在弹窗打开时加载（数据量大）
  useEffect(() => {
    if (!visible) return;

    const loadUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tenants/${tenantId}/users/selectable`);
        const data = await res.json();
        if (data.success) setUsers(data.data || []);
      } catch (err) {
        console.error('加载用户失败:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [visible, tenantId]);

  // 根据 value 加载已选项详情
  useEffect(() => {
    if (!value) {
      setSelectedDetails([]);
      return;
    }

    const loadDetails = async () => {
      try {
        switch (value.type) {
          case 'user': {
            if (value.userIds.length === 0) { setSelectedDetails([]); return; }
            const res = await fetch(`/api/tenants/${tenantId}/users/batch?ids=${value.userIds.join(',')}`);
            const data = await res.json();
            if (data.success) {
              setSelectedDetails((data.data || []).map((u: any) => ({ id: u.userId, name: u.name })));
            }
            break;
          }
          case 'role': {
            const names = roles.filter(r => value.roleIds.includes(r.roleId)).map(r => ({ id: r.roleId, name: r.name }));
            if (names.length > 0) setSelectedDetails(names);
            else {
              // roles 可能还没加载，用 ID 暂时展示
              setSelectedDetails(value.roleIds.map(id => ({ id, name: id })));
            }
            break;
          }
          case 'department': {
            const flatten = (nodes: AssigneeDeptInfo[]): AssigneeDeptInfo[] =>
              nodes.flatMap(n => [n, ...(n.children ? flatten(n.children) : [])]);
            const allDepts = flatten(departments);
            const names = allDepts.filter(d => value.deptIds.includes(d.deptId)).map(d => ({ id: d.deptId, name: d.name }));
            if (names.length > 0) setSelectedDetails(names);
            else setSelectedDetails(value.deptIds.map(id => ({ id, name: id })));
            break;
          }
          case 'position': {
            const names = positions.filter(p => value.positionIds.includes(p.positionId)).map(p => ({ id: p.positionId, name: p.name }));
            if (names.length > 0) setSelectedDetails(names);
            else setSelectedDetails(value.positionIds.map(id => ({ id, name: id })));
            break;
          }
        }
      } catch {
        // 静默失败，用 ID 展示
      }
    };

    loadDetails();
  }, [value, tenantId, roles, departments, positions]);

  // 打开弹窗时同步临时状态
  const handleOpen = useCallback(() => {
    if (disabled) return;
    setTempStrategy(value);
    setActiveTab(value?.type || 'user');
    setVisible(true);
  }, [disabled, value]);

  // 确认选择
  const handleConfirm = useCallback(() => {
    onChange?.(tempStrategy);
    setVisible(false);
  }, [tempStrategy, onChange]);

  // 清除
  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(undefined);
  }, [onChange]);

  // 切换选中项（用户）
  const handleToggleUser = useCallback((userId: string) => {
    setTempStrategy(prev => {
      if (prev?.type === 'user') {
        const exists = prev.userIds.includes(userId);
        const newIds = exists ? prev.userIds.filter(id => id !== userId) : [...prev.userIds, userId];
        return newIds.length > 0 ? { type: 'user', userIds: newIds } : undefined;
      }
      return { type: 'user', userIds: [userId] };
    });
  }, []);

  // 切换选中项（角色）
  const handleToggleRole = useCallback((roleId: string) => {
    setTempStrategy(prev => {
      if (prev?.type === 'role') {
        const exists = prev.roleIds.includes(roleId);
        const newIds = exists ? prev.roleIds.filter(id => id !== roleId) : [...prev.roleIds, roleId];
        return newIds.length > 0 ? { type: 'role', roleIds: newIds } : undefined;
      }
      return { type: 'role', roleIds: [roleId] };
    });
  }, []);

  // 切换选中项（部门）
  const handleToggleDept = useCallback((deptId: string) => {
    setTempStrategy(prev => {
      if (prev?.type === 'department') {
        const exists = prev.deptIds.includes(deptId);
        const newIds = exists ? prev.deptIds.filter(id => id !== deptId) : [...prev.deptIds, deptId];
        return newIds.length > 0 ? { type: 'department', deptIds: newIds } : undefined;
      }
      return { type: 'department', deptIds: [deptId] };
    });
  }, []);

  // 切换选中项（岗位）
  const handleTogglePosition = useCallback((positionId: string) => {
    setTempStrategy(prev => {
      if (prev?.type === 'position') {
        const exists = prev.positionIds.includes(positionId);
        const newIds = exists ? prev.positionIds.filter(id => id !== positionId) : [...prev.positionIds, positionId];
        return newIds.length > 0 ? { type: 'position', positionIds: newIds } : undefined;
      }
      return { type: 'position', positionIds: [positionId] };
    });
  }, []);

  // 切换 Tab 时，清空临时策略（不同维度互斥）
  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key as AssigneeStrategyType);
    setTempStrategy(undefined);
  }, []);

  // 部门树数据
  const deptTreeData = useMemo(() => {
    const convert = (nodes: AssigneeDeptInfo[]): any[] =>
      nodes.map(n => ({
        key: n.deptId,
        title: (
          <span>
            {n.name}
            {n.userCount !== undefined && (
              <span style={{ color: '#999', marginLeft: 4, fontSize: 12 }}>({n.userCount})</span>
            )}
          </span>
        ),
        children: n.children ? convert(n.children) : undefined,
      }));
    return convert(departments);
  }, [departments]);

  // 过滤后的用户列表
  const filteredUsers = useMemo(() => {
    if (!keyword) return users;
    const kw = keyword.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(kw));
  }, [users, keyword]);

  // 当前 Tab 对应的选中 ID 集合
  const isItemSelected = useCallback((id: string): boolean => {
    if (!tempStrategy) return false;
    switch (tempStrategy.type) {
      case 'user': return tempStrategy.userIds.includes(id);
      case 'role': return tempStrategy.roleIds.includes(id);
      case 'department': return tempStrategy.deptIds.includes(id);
      case 'position': return tempStrategy.positionIds.includes(id);
      default: return false;
    }
  }, [tempStrategy]);

  // 渲染弹窗内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'user':
        return (
          <div>
            <Search
              placeholder="搜索姓名"
              allowClear
              onChange={e => setKeyword(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            <div style={{ height: 360, overflow: 'auto' }}>
              <Spin spinning={loading}>
                {filteredUsers.length > 0 ? (
                  <List
                    dataSource={filteredUsers}
                    renderItem={(user: AssigneeUserInfo) => {
                      const selected = isItemSelected(user.userId);
                      return (
                        <List.Item
                          key={user.userId}
                          onClick={() => handleToggleUser(user.userId)}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: selected ? '#e6f7ff' : undefined,
                            padding: '8px 12px',
                          }}
                        >
                          <List.Item.Meta
                            avatar={<Avatar src={user.avatar} icon={<UserOutlined />} size={32} />}
                            title={
                              <Space>
                                <span>{user.name}</span>
                                {selected && <Tag color="blue">已选</Tag>}
                              </Space>
                            }
                          />
                          <Checkbox checked={selected} />
                        </List.Item>
                      );
                    }}
                    size="small"
                  />
                ) : (
                  <Empty description="暂无用户数据" />
                )}
              </Spin>
            </div>
          </div>
        );

      case 'role':
        return (
          <div style={{ height: 400, overflow: 'auto' }}>
            <Spin spinning={loading}>
              {roles.length > 0 ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {roles.map(role => {
                    const selected = isItemSelected(role.roleId);
                    return (
                      <div
                        key={role.roleId}
                        onClick={() => handleToggleRole(role.roleId)}
                        style={{
                          cursor: 'pointer',
                          padding: '8px 12px',
                          backgroundColor: selected ? '#e6f7ff' : undefined,
                          borderRadius: 4,
                        }}
                      >
                        <Checkbox checked={selected}>
                          <span style={{ fontWeight: 500 }}>{role.name}</span>
                          {role.description && (
                            <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>{role.description}</span>
                          )}
                        </Checkbox>
                      </div>
                    );
                  })}
                </Space>
              ) : (
                <Empty description="暂无角色数据" />
              )}
            </Spin>
          </div>
        );

      case 'department':
        return (
          <div style={{ height: 400, overflow: 'auto' }}>
            <Spin spinning={loading}>
              {deptTreeData.length > 0 ? (
                <Tree
                  treeData={deptTreeData}
                  checkable
                  checkedKeys={tempStrategy?.type === 'department' ? tempStrategy.deptIds : []}
                  onCheck={(checked) => {
                    const ids = (Array.isArray(checked) ? checked : checked.checked) as string[];
                    setTempStrategy(ids.length > 0 ? { type: 'department', deptIds: ids } : undefined);
                  }}
                  defaultExpandAll
                />
              ) : (
                <Empty description="暂无部门数据" />
              )}
            </Spin>
          </div>
        );

      case 'position':
        return (
          <div style={{ height: 400, overflow: 'auto' }}>
            <Spin spinning={loading}>
              {positions.length > 0 ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {positions.map(pos => {
                    const selected = isItemSelected(pos.positionId);
                    return (
                      <div
                        key={pos.positionId}
                        onClick={() => handleTogglePosition(pos.positionId)}
                        style={{
                          cursor: 'pointer',
                          padding: '8px 12px',
                          backgroundColor: selected ? '#e6f7ff' : undefined,
                          borderRadius: 4,
                        }}
                      >
                        <Checkbox checked={selected}>
                          <span style={{ fontWeight: 500 }}>{pos.name}</span>
                          {pos.category && (
                            <Tag style={{ marginLeft: 8 }} color="blue">{pos.category}</Tag>
                          )}
                        </Checkbox>
                      </div>
                    );
                  })}
                </Space>
              ) : (
                <Empty description="暂无岗位数据" />
              )}
            </Spin>
          </div>
        );
    }
  };

  // 渲染已选策略的 Tag
  const renderTags = () => {
    if (!value || selectedDetails.length === 0) {
      return <span style={{ color: '#bfbfbf', fontSize: 13 }}>{placeholder}</span>;
    }

    return (
      <Space size={[4, 4]} wrap>
        <Tag
          color={
            value.type === 'user' ? 'blue' :
            value.type === 'role' ? 'purple' :
            value.type === 'department' ? 'cyan' :
            'orange'
          }
          style={{ marginRight: 0 }}
        >
          {TAB_LABELS[value.type]}
        </Tag>
        {selectedDetails.map(item => (
          <Tag
            key={item.id}
            closable={!disabled}
            onClose={(e) => {
              e.stopPropagation();
              // 从策略中移除该项
              if (!value) return;
              let newStrategy: AssigneeStrategy | undefined;
              switch (value.type) {
                case 'user':
                  newStrategy = value.userIds.filter(id => id !== item.id).length > 0
                    ? { type: 'user', userIds: value.userIds.filter(id => id !== item.id) }
                    : undefined;
                  break;
                case 'role':
                  newStrategy = value.roleIds.filter(id => id !== item.id).length > 0
                    ? { type: 'role', roleIds: value.roleIds.filter(id => id !== item.id) }
                    : undefined;
                  break;
                case 'department':
                  newStrategy = value.deptIds.filter(id => id !== item.id).length > 0
                    ? { type: 'department', deptIds: value.deptIds.filter(id => id !== item.id) }
                    : undefined;
                  break;
                case 'position':
                  newStrategy = value.positionIds.filter(id => id !== item.id).length > 0
                    ? { type: 'position', positionIds: value.positionIds.filter(id => id !== item.id) }
                    : undefined;
                  break;
              }
              onChange?.(newStrategy);
            }}
          >
            {item.name}
          </Tag>
        ))}
      </Space>
    );
  };

  // 当前临时策略的选中数量
  const tempSelectedCount = useMemo(() => {
    if (!tempStrategy) return 0;
    switch (tempStrategy.type) {
      case 'user': return tempStrategy.userIds.length;
      case 'role': return tempStrategy.roleIds.length;
      case 'department': return tempStrategy.deptIds.length;
      case 'position': return tempStrategy.positionIds.length;
      default: return 0;
    }
  }, [tempStrategy]);

  return (
    <>
      <div
        onClick={handleOpen}
        style={{
          minHeight: 32,
          padding: '4px 11px',
          border: '1px solid #d9d9d9',
          borderRadius: 4,
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: disabled ? '#f5f5f5' : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {renderTags()}
        </div>
        {!disabled && value && (
          <CloseCircleOutlined
            style={{ color: '#bfbfbf', flexShrink: 0 }}
            onClick={handleClear}
          />
        )}
        {!disabled && !value && (
          <UserOutlined style={{ color: '#bfbfbf', flexShrink: 0 }} />
        )}
      </div>

      <Modal
        title="设置审批人"
        open={visible}
        onCancel={() => setVisible(false)}
        onOk={handleConfirm}
        width={640}
        okText="确定"
        cancelText="取消"
        okButtonProps={{ disabled: !tempStrategy || tempSelectedCount === 0 }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={(Object.keys(TAB_LABELS) as AssigneeStrategyType[]).map(key => ({
            key,
            label: (
              <span>
                {TAB_ICONS[key]} {TAB_LABELS[key]}
              </span>
            ),
          }))}
        />
        {renderTabContent()}
        {tempSelectedCount > 0 && (
          <div style={{ marginTop: 8, color: '#666', fontSize: 13 }}>
            已选 {tempSelectedCount} 项
          </div>
        )}
      </Modal>
    </>
  );
};

export default AssigneeSelector;
