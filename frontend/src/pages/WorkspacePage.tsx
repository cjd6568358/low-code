/**
 * 工作台页面
 *
 * 展示待办事项、通知中心、快捷入口、个人信息四个区块。
 * 管理员和员工共用，数据内容根据角色略有差异。
 */

import { Card, List, Badge, Avatar, Tag, Button, Typography } from 'antd';
import {
  ClockCircleOutlined,
  BellOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';

const { Text, Title } = Typography;

/** 模拟待办数据 */
const MOCK_TODOS = [
  {
    id: '1',
    title: '采购申请 - 办公设备采购',
    applicant: '张三',
    status: 'pending' as const,
    createdAt: '2026-06-13 09:30',
  },
  {
    id: '2',
    title: '请假申请 - 年假 3 天',
    applicant: '李四',
    status: 'pending' as const,
    createdAt: '2026-06-13 10:15',
  },
  {
    id: '3',
    title: '报销申请 - 出差费用报销',
    applicant: '王五',
    status: 'pending' as const,
    createdAt: '2026-06-12 16:45',
  },
];

/** 模拟通知数据 */
const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    title: '系统将于今晚 22:00 进行维护升级',
    type: 'system' as const,
    time: '10 分钟前',
    read: false,
  },
  {
    id: '2',
    title: '您的采购申请已审批通过',
    type: 'workflow' as const,
    time: '1 小时前',
    read: false,
  },
  {
    id: '3',
    title: '新应用"山水 CRM"已发布',
    type: 'app' as const,
    time: '3 小时前',
    read: true,
  },
  {
    id: '4',
    title: '本月考勤汇总已生成',
    type: 'system' as const,
    time: '昨天',
    read: true,
  },
];

/** 模拟快捷应用 */
const MOCK_APPS = [
  { id: '1', name: '山水 OA', icon: '📋', color: '#4f46e5' },
  { id: '2', name: '山水 CRM', icon: '🤝', color: '#059669' },
  { id: '3', name: '项目管理', icon: '📊', color: '#d97706' },
  { id: '4', name: '人事管理', icon: '👥', color: '#dc2626' },
];

export default function WorkspacePage() {
  const { user, isAdmin } = useAuth();

  return (
    <div>
      {/* 欢迎区域（含个人信息） */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
        <Avatar size={56} style={{ background: '#4f46e5', fontSize: 24, flexShrink: 0 }}>
          {user?.name?.[0]}
        </Avatar>
        <div>
          <Title level={4} style={{ marginBottom: 2 }}>
            你好，{user?.name} 👋
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {user?.email}
          </Text>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {user?.departmentName}
              {user?.positionName ? ` · ${user.positionName}` : ''}
              {' · '}
              {isAdmin ? '租户管理员' : '员工'}
            </Text>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <Card className="stat-card" style={{ flex: 1 }}>
          <div className="stat-value" style={{ color: '#4f46e5' }}>
            {isAdmin ? 12 : 3}
          </div>
          <div className="stat-label">待办事项</div>
        </Card>
        <Card className="stat-card" style={{ flex: 1 }}>
          <div className="stat-value" style={{ color: '#059669' }}>
            {isAdmin ? 28 : 5}
          </div>
          <div className="stat-label">本月已办</div>
        </Card>
        <Card className="stat-card" style={{ flex: 1 }}>
          <div className="stat-value" style={{ color: '#d97706' }}>
            {isAdmin ? 6 : 2}
          </div>
          <div className="stat-label">未读消息</div>
        </Card>
        <Card className="stat-card" style={{ flex: 1 }}>
          <div className="stat-value" style={{ color: '#dc2626' }}>
            {isAdmin ? 8 : 4}
          </div>
          <div className="stat-label">可用应用</div>
        </Card>
      </div>

      {/* 四区块网格 */}
      <div className="workspace-grid">
        {/* 待办事项 */}
        <Card
          className="workspace-card"
          title={
            <span>
              <ClockCircleOutlined style={{ marginRight: 8, color: '#4f46e5' }} />
              待办事项
            </span>
          }
          extra={
            <Badge count={MOCK_TODOS.length} style={{ backgroundColor: '#4f46e5' }}>
              <Button type="link" size="small">
                查看全部
              </Button>
            </Badge>
          }
        >
          <List
            dataSource={MOCK_TODOS}
            renderItem={(item) => (
              <List.Item
                style={{ cursor: 'pointer', padding: '10px 0' }}
                actions={[
                  <Tag key="status" color="orange">
                    待审批
                  </Tag>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar size={36} style={{ background: '#f0f0f0', color: '#595959' }}>
                      <FileTextOutlined />
                    </Avatar>
                  }
                  title={item.title}
                  description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.applicant} · {item.createdAt}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        </Card>

        {/* 通知中心 */}
        <Card
          className="workspace-card"
          title={
            <span>
              <BellOutlined style={{ marginRight: 8, color: '#d97706' }} />
              通知中心
            </span>
          }
          extra={
            <Button type="link" size="small">
              全部已读
            </Button>
          }
        >
          <List
            dataSource={MOCK_NOTIFICATIONS}
            renderItem={(item) => (
              <List.Item style={{ cursor: 'pointer', padding: '10px 0' }}>
                <List.Item.Meta
                  avatar={
                    <Badge dot={!item.read} offset={[-2, 2]}>
                      <Avatar
                        size={36}
                        style={{
                          background:
                            item.type === 'system'
                              ? '#e6f7ff'
                              : item.type === 'workflow'
                                ? '#f6ffed'
                                : '#fff7e6',
                          color:
                            item.type === 'system'
                              ? '#1890ff'
                              : item.type === 'workflow'
                                ? '#52c41a'
                                : '#fa8c16',
                        }}
                      >
                        {item.type === 'system' ? (
                          <BellOutlined />
                        ) : item.type === 'workflow' ? (
                          <CheckCircleOutlined />
                        ) : (
                          <AppstoreOutlined />
                        )}
                      </Avatar>
                    </Badge>
                  }
                  title={
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: item.read ? 400 : 600,
                      }}
                    >
                      {item.title}
                    </Text>
                  }
                  description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.time}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        </Card>

        {/* 快捷入口 */}
        <Card
          className="workspace-card"
          title={
            <span>
              <AppstoreOutlined style={{ marginRight: 8, color: '#059669' }} />
              快捷入口
            </span>
          }
          extra={
            <Button type="link" size="small" icon={<RightOutlined />}>
              全部应用
            </Button>
          }
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
            }}
          >
            {MOCK_APPS.map((app) => (
              <div
                key={app.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: '#fafafa',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = app.color;
                  e.currentTarget.style.background = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.background = '#fafafa';
                }}
              >
                <span style={{ fontSize: 24 }}>{app.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{app.name}</span>
              </div>
            ))}
            {/* 发起流程快捷按钮 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '12px 14px',
                borderRadius: 10,
                background: '#f0f5ff',
                cursor: 'pointer',
                border: '1px dashed #4f46e5',
                color: '#4f46e5',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <span>＋</span>
              <span>发起流程</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
