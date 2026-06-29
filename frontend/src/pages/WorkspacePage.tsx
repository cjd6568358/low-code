/**
 * 工作台页面
 *
 * 展示待办事项、通知中心、快捷入口、个人信息四个区块。
 * 管理员和员工共用，数据内容根据角色略有差异。
 * 数据从 API 加载，不再使用 Mock。
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, List, Badge, Avatar, Tag, Button, Typography, Spin, App } from 'antd';
import {
  ClockCircleOutlined,
  BellOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';
import { shortId } from '../utils/resourceId';

const { Text, Title } = Typography;

/** 待办任务 */
interface TodoItem {
  id: string;
  title: string;
  applicant: string;
  status: string;
  createdAt: string;
}

/** 通知消息 */
interface NotificationItem {
  id: number;
  title: string;
  category: string;
  time: string;
  isRead: boolean;
}

/** 快捷应用 */
interface ShortcutApp {
  appId: string;
  name: string;
  icon: string;
  color: string;
}

/** 应用颜色列表 */
const APP_COLORS = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

/** 格式化相对时间 */
function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} 小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} 天前`;
  return dateStr.slice(0, 10);
}

export default function WorkspacePage() {
  const { user, isAdmin } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [apps, setApps] = useState<ShortcutApp[]>([]);
  const [stats, setStats] = useState({ todoCount: 0, doneCount: 0, unreadCount: 0, appCount: 0 });
  const [loading, setLoading] = useState(true);

  /** 加载工作台数据 */
  const loadWorkspaceData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 并行加载待办、通知、应用列表
      const [todoResp, msgResp, appResp] = await Promise.allSettled([
        fetch('/api/workflow-tasks?status=pending'),
        fetch(`/api/messages?recipientId=${user.id}&limit=10`),
        fetch('/api/apps'),
      ]);

      // 待办事项
      if (todoResp.status === 'fulfilled') {
        const todoData = await todoResp.value.json();
        const taskList = (todoData.data || []).slice(0, 5).map((t: Record<string, unknown>) => ({
          id: t.id as string,
          title: (t.title || t.name || '待办任务') as string,
          applicant: (t.startedBy || t.assigneeName || '') as string,
          status: t.status as string,
          createdAt: (t.createdAt || t.created_at || '') as string,
        }));
        setTodos(taskList);
        setStats((prev) => ({ ...prev, todoCount: todoData.total || taskList.length }));
      }

      // 通知消息
      if (msgResp.status === 'fulfilled') {
        const msgData = await msgResp.value.json();
        if (msgData.success) {
          const msgList = (msgData.messages || []).map((m: Record<string, unknown>) => ({
            id: m.id as number,
            title: m.title as string,
            category: (m.category || 'system') as string,
            time: formatRelativeTime(m.createdAt as string),
            isRead: m.isRead as boolean,
          }));
          setNotifications(msgList);
          // 计算未读数
          const unread = msgList.filter((m: NotificationItem) => !m.isRead).length;
          setStats((prev) => ({ ...prev, unreadCount: unread }));
        }
      }

      // 应用列表
      if (appResp.status === 'fulfilled') {
        const appData = await appResp.value.json();
        if (appData.success) {
          const appList = (appData.apps || []).slice(0, 6).map((a: Record<string, unknown>, i: number) => ({
            appId: a.appId as string,
            name: a.name as string,
            icon: (a.icon || '📦') as string,
            color: APP_COLORS[i % APP_COLORS.length],
          }));
          setApps(appList);
          setStats((prev) => ({ ...prev, appCount: appData.apps?.length || 0 }));
        }
      }
    } catch {
      message.error('加载工作台数据失败');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

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
            {stats.todoCount}
          </div>
          <div className="stat-label">待办事项</div>
        </Card>
        <Card className="stat-card" style={{ flex: 1 }}>
          <div className="stat-value" style={{ color: '#059669' }}>
            {stats.doneCount}
          </div>
          <div className="stat-label">本月已办</div>
        </Card>
        <Card className="stat-card" style={{ flex: 1 }}>
          <div className="stat-value" style={{ color: '#d97706' }}>
            {stats.unreadCount}
          </div>
          <div className="stat-label">未读消息</div>
        </Card>
        <Card className="stat-card" style={{ flex: 1 }}>
          <div className="stat-value" style={{ color: '#dc2626' }}>
            {stats.appCount}
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
            <Badge count={todos.length} style={{ backgroundColor: '#4f46e5' }}>
              <Button type="link" size="small">
                查看全部
              </Button>
            </Badge>
          }
        >
          <List
            dataSource={todos}
            locale={{ emptyText: '暂无待办' }}
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
                      {item.applicant} · {formatRelativeTime(item.createdAt)}
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
            dataSource={notifications}
            locale={{ emptyText: '暂无通知' }}
            renderItem={(item) => (
              <List.Item style={{ cursor: 'pointer', padding: '10px 0' }}>
                <List.Item.Meta
                  avatar={
                    <Badge dot={!item.isRead} offset={[-2, 2]}>
                      <Avatar
                        size={36}
                        style={{
                          background:
                            item.category === 'system'
                              ? '#e6f7ff'
                              : item.category === 'workflow'
                                ? '#f6ffed'
                                : '#fff7e6',
                          color:
                            item.category === 'system'
                              ? '#1890ff'
                              : item.category === 'workflow'
                                ? '#52c41a'
                                : '#fa8c16',
                        }}
                      >
                        {item.category === 'system' ? (
                          <BellOutlined />
                        ) : item.category === 'workflow' ? (
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
                        fontWeight: item.isRead ? 400 : 600,
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
            <Button
              type="link"
              size="small"
              icon={<RightOutlined />}
              onClick={() => navigate(`/${user?.tenantId}/apps`)}
            >
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
            {apps.map((app) => (
              <div
                key={app.appId}
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
                onClick={() => navigate(`/${user?.tenantId}/app/${shortId(app.appId)}`)}
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
            {apps.length === 0 && (
              <div
                style={{
                  gridColumn: 'span 2',
                  textAlign: 'center',
                  color: '#bfbfbf',
                  fontSize: 13,
                  padding: '24px 0',
                }}
              >
                暂无应用
              </div>
            )}
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
