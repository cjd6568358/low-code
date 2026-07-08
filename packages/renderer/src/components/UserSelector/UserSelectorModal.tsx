/**
 * 选人弹窗组件
 *
 * 支持按部门树、岗位、角色多维度筛选人员。
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Modal,
  Input,
  Tree,
  Checkbox,
  List,
  Avatar,
  Tag,
  Space,
  Spin,
  Empty,
  Tabs,
  Badge,
} from 'antd';
import {
  UserOutlined,
  SearchOutlined,
  TeamOutlined,
  ApartmentOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type {
  UserSelectorModalProps,
  UserInfo,
  DepartmentNode,
  PositionInfo,
  RoleInfo,
} from './types';

const { Search } = Input;

/**
 * 选人弹窗组件
 */
export const UserSelectorModal: React.FC<UserSelectorModalProps> = ({
  visible,
  onClose,
  onConfirm,
  selectedUsers = [],
  mode = 'multiple',
  filters,
  tenantId,
  maxCount,
}) => {
  // 状态
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<DepartmentNode[]>([]);
  const [positions, setPositions] = useState<PositionInfo[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string | undefined>();
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [currentSelected, setCurrentSelected] = useState<UserInfo[]>(selectedUsers);
  const [activeTab, setActiveTab] = useState('department');

  // 加载部门树
  useEffect(() => {
    if (!visible) return;

    const loadDepartments = async () => {
      try {
        const response = await fetch(`/api/tenants/${tenantId}/departments`);
        const data = await response.json();
        if (data.success) {
          setDepartments(data.data || []);
        }
      } catch (error) {
        console.error('加载部门失败:', error);
      }
    };

    loadDepartments();
  }, [visible, tenantId]);

  // 加载岗位列表
  useEffect(() => {
    if (!visible) return;

    const loadPositions = async () => {
      try {
        const response = await fetch(`/api/tenants/${tenantId}/positions`);
        const data = await response.json();
        if (data.success) {
          setPositions(data.data || []);
        }
      } catch (error) {
        console.error('加载岗位失败:', error);
      }
    };

    loadPositions();
  }, [visible, tenantId]);

  // 加载角色列表
  useEffect(() => {
    if (!visible) return;

    const loadRoles = async () => {
      try {
        const response = await fetch(`/api/tenants/${tenantId}/roles`);
        const data = await response.json();
        if (data.success) {
          setRoles(data.data || []);
        }
      } catch (error) {
        console.error('加载角色失败:', error);
      }
    };

    loadRoles();
  }, [visible, tenantId]);

  // 加载用户列表
  useEffect(() => {
    if (!visible) return;

    const loadUsers = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (keyword) params.append('keyword', keyword);
        if (selectedDeptId) params.append('deptId', selectedDeptId);
        if (selectedPositions.length > 0) {
          params.append('positionIds', selectedPositions.join(','));
        }
        if (selectedRoles.length > 0) {
          params.append('roleIds', selectedRoles.join(','));
        }

        const response = await fetch(`/api/tenants/${tenantId}/users/selectable?${params.toString()}`);
        const data = await response.json();
        if (data.success) {
          setUsers(data.data || []);
        }
      } catch (error) {
        console.error('加载用户失败:', error);
      } finally {
        setLoading(false);
      }
    };

    // 防抖
    const timer = setTimeout(loadUsers, 300);
    return () => clearTimeout(timer);
  }, [visible, tenantId, keyword, selectedDeptId, selectedPositions, selectedRoles]);

  // 部门树数据转换
  const treeData = useMemo(() => {
    const convertToTreeData = (nodes: DepartmentNode[]): any[] => {
      return nodes.map((node) => ({
        key: node.deptId,
        title: (
          <span>
            {node.name}
            {node.userCount !== undefined && (
              <span style={{ color: '#999', marginLeft: 4, fontSize: 12 }}>
                ({node.userCount})
              </span>
            )}
          </span>
        ),
        icon: <ApartmentOutlined />,
        children: node.children ? convertToTreeData(node.children) : undefined,
      }));
    };

    return convertToTreeData(departments);
  }, [departments]);

  // 搜索关键词变更
  const handleSearch = useCallback((value: string) => {
    setKeyword(value);
  }, []);

  // 选择部门
  const handleSelectDept = useCallback((selectedKeys: React.Key[]) => {
    setSelectedDeptId(selectedKeys[0] as string);
  }, []);

  // 切换岗位筛选
  const handleTogglePosition = useCallback((positionId: string) => {
    setSelectedPositions((prev) =>
      prev.includes(positionId)
        ? prev.filter((id) => id !== positionId)
        : [...prev, positionId]
    );
  }, []);

  // 切换角色筛选
  const handleToggleRole = useCallback((roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  }, []);

  // 选择/取消选择用户
  const handleToggleUser = useCallback(
    (user: UserInfo) => {
      const isSelected = currentSelected.some((u) => u.userId === user.userId);

      if (mode === 'single') {
        setCurrentSelected(isSelected ? [] : [user]);
      } else {
        if (isSelected) {
          setCurrentSelected((prev) => prev.filter((u) => u.userId !== user.userId));
        } else {
          if (maxCount && currentSelected.length >= maxCount) {
            return; // 超过最大选择数量
          }
          setCurrentSelected((prev) => [...prev, user]);
        }
      }
    },
    [currentSelected, mode, maxCount]
  );

  // 确认选择
  const handleConfirm = useCallback(() => {
    onConfirm(currentSelected);
  }, [currentSelected, onConfirm]);

  // 渲染用户列表项
  const renderUserItem = (user: UserInfo) => {
    const isSelected = currentSelected.some((u) => u.userId === user.userId);
    const primaryDept = user.departments?.find((d) => d.isPrimary);

    return (
      <List.Item
        key={user.userId}
        onClick={() => handleToggleUser(user)}
        style={{
          cursor: 'pointer',
          backgroundColor: isSelected ? '#e6f7ff' : undefined,
          padding: '8px 12px',
        }}
      >
        <List.Item.Meta
          avatar={
            <Avatar
              src={user.avatar}
              icon={<UserOutlined />}
              size={32}
            />
          }
          title={
            <Space>
              <span>{user.name}</span>
              {isSelected && <Tag color="blue">已选</Tag>}
            </Space>
          }
          description={
            <Space size={4}>
              {primaryDept && (
                <Tag>{primaryDept.deptName}</Tag>
              )}
              {primaryDept?.positionName && (
                <Tag color="green">{primaryDept.positionName}</Tag>
              )}
            </Space>
          }
        />
        <Checkbox checked={isSelected} />
      </List.Item>
    );
  };

  // 渲染左侧筛选面板
  const renderFilterPanel = () => (
    <div style={{ width: 200, borderRight: '1px solid #f0f0f0', paddingRight: 12 }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="small"
        items={[
          {
            key: 'department',
            label: (
              <span>
                <ApartmentOutlined /> 部门
              </span>
            ),
            children: (
              <div style={{ height: 400, overflow: 'auto' }}>
                {treeData.length > 0 ? (
                  <Tree
                    treeData={treeData}
                    onSelect={handleSelectDept}
                    selectedKeys={selectedDeptId ? [selectedDeptId] : []}
                    showIcon
                    defaultExpandAll
                  />
                ) : (
                  <Empty description="暂无部门数据" />
                )}
              </div>
            ),
          },
          {
            key: 'position',
            label: (
              <span>
                <TeamOutlined /> 岗位
              </span>
            ),
            children: (
              <div style={{ height: 400, overflow: 'auto' }}>
                {positions.length > 0 ? (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {positions.map((pos) => (
                      <Checkbox
                        key={pos.positionId}
                        checked={selectedPositions.includes(pos.positionId)}
                        onChange={() => handleTogglePosition(pos.positionId)}
                      >
                        {pos.name}
                        <Tag
                          style={{ marginLeft: 4 }}
                          color={
                            pos.category === 'management'
                              ? 'red'
                              : pos.category === 'technical'
                              ? 'blue'
                              : pos.category === 'business'
                              ? 'green'
                              : 'default'
                          }
                        >
                          {pos.category === 'management'
                            ? '管理'
                            : pos.category === 'technical'
                            ? '技术'
                            : pos.category === 'business'
                            ? '业务'
                            : '支持'}
                        </Tag>
                      </Checkbox>
                    ))}
                  </Space>
                ) : (
                  <Empty description="暂无岗位数据" />
                )}
              </div>
            ),
          },
          {
            key: 'role',
            label: (
              <span>
                <SafetyCertificateOutlined /> 角色
              </span>
            ),
            children: (
              <div style={{ height: 400, overflow: 'auto' }}>
                {roles.length > 0 ? (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {roles.map((role) => (
                      <Checkbox
                        key={role.roleId}
                        checked={selectedRoles.includes(role.roleId)}
                        onChange={() => handleToggleRole(role.roleId)}
                      >
                        {role.name}
                        {role.description && (
                          <span style={{ color: '#999', marginLeft: 4, fontSize: 12 }}>
                            {role.description}
                          </span>
                        )}
                      </Checkbox>
                    ))}
                  </Space>
                ) : (
                  <Empty description="暂无角色数据" />
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );

  return (
    <Modal
      title="选择人员"
      open={visible}
      onCancel={onClose}
      onOk={handleConfirm}
      width={720}
      okText="确定"
      cancelText="取消"
      okButtonProps={{
        disabled: currentSelected.length === 0,
      }}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        {/* 左侧筛选 */}
        {renderFilterPanel()}

        {/* 右侧用户列表 */}
        <div style={{ flex: 1 }}>
          {/* 搜索框 */}
          <Search
            placeholder="搜索姓名、邮箱、手机号"
            allowClear
            onChange={(e) => handleSearch(e.target.value)}
            style={{ marginBottom: 12 }}
          />

          {/* 已选数量 */}
          {mode === 'multiple' && (
            <div style={{ marginBottom: 8, color: '#666', fontSize: 13 }}>
              已选 {currentSelected.length} 人
              {maxCount && ` / 最多 ${maxCount} 人`}
            </div>
          )}

          {/* 用户列表 */}
          <div style={{ height: 360, overflow: 'auto' }}>
            <Spin spinning={loading}>
              {users.length > 0 ? (
                <List
                  dataSource={users}
                  renderItem={renderUserItem}
                  size="small"
                />
              ) : (
                <Empty description="暂无用户数据" />
              )}
            </Spin>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default UserSelectorModal;
