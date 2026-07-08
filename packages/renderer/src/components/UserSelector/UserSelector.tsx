/**
 * 选人组件
 *
 * 支持从部门/岗位/角色多维度选择人员。
 * 用于流程节点配置中的审批人、候选用户等字段。
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Tag, Space, Empty } from 'antd';
import { UserOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { UserSelectorModal } from './UserSelectorModal';
import type { UserSelectorProps, UserInfo } from './types';

/**
 * 选人组件
 */
export const UserSelector: React.FC<UserSelectorProps> = ({
  value,
  onChange,
  mode = 'single',
  filters,
  placeholder = '选择人员',
  disabled = false,
  tenantId,
  maxCount,
}) => {
  const [visible, setVisible] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // 根据 value 加载用户信息
  useEffect(() => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      setSelectedUsers([]);
      return;
    }

    const loadUsers = async () => {
      setLoading(true);
      try {
        const ids = Array.isArray(value) ? value : [value];
        // 调用API获取用户信息
        const response = await fetch(`/api/tenants/${tenantId}/users/batch?ids=${ids.join(',')}`);
        const data = await response.json();
        if (data.success) {
          setSelectedUsers(data.data || []);
        }
      } catch (error) {
        console.error('加载用户信息失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [value, tenantId]);

  // 打开弹窗
  const handleOpen = useCallback(() => {
    if (!disabled) {
      setVisible(true);
    }
  }, [disabled]);

  // 关闭弹窗
  const handleClose = useCallback(() => {
    setVisible(false);
  }, []);

  // 确认选择
  const handleConfirm = useCallback(
    (users: UserInfo[]) => {
      setSelectedUsers(users);
      setVisible(false);

      if (mode === 'single') {
        onChange?.(users.length > 0 ? users[0].userId : undefined);
      } else {
        onChange?.(users.map((u) => u.userId));
      }
    },
    [mode, onChange]
  );

  // 移除用户
  const handleRemove = useCallback(
    (userId: string) => {
      const newUsers = selectedUsers.filter((u) => u.userId !== userId);
      setSelectedUsers(newUsers);

      if (mode === 'single') {
        onChange?.(undefined);
      } else {
        onChange?.(newUsers.map((u) => u.userId));
      }
    },
    [selectedUsers, mode, onChange]
  );

  // 渲染已选用户标签
  const renderTags = () => {
    if (selectedUsers.length === 0) {
      return (
        <span style={{ color: '#bfbfbf', fontSize: 13 }}>
          {placeholder}
        </span>
      );
    }

    if (mode === 'single') {
      const user = selectedUsers[0];
      return (
        <Tag
          closable={!disabled}
          onClose={(e) => {
            e.stopPropagation();
            handleRemove(user.userId);
          }}
          icon={<UserOutlined />}
        >
          {user.name}
        </Tag>
      );
    }

    return (
      <Space size={[4, 4]} wrap>
        {selectedUsers.map((user) => (
          <Tag
            key={user.userId}
            closable={!disabled}
            onClose={(e) => {
              e.stopPropagation();
              handleRemove(user.userId);
            }}
            icon={<UserOutlined />}
          >
            {user.name}
          </Tag>
        ))}
      </Space>
    );
  };

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
        {!disabled && (
          <UserOutlined style={{ color: '#bfbfbf', flexShrink: 0 }} />
        )}
      </div>

      <UserSelectorModal
        visible={visible}
        onClose={handleClose}
        onConfirm={handleConfirm}
        selectedUsers={selectedUsers}
        mode={mode}
        filters={filters}
        tenantId={tenantId}
        maxCount={maxCount}
      />
    </>
  );
};

export default UserSelector;
