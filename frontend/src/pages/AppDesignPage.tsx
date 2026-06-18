/**
 * 应用资源设计器
 *
 * 布局：
 *   左侧一级菜单：资源分类（页面/卡片/表单/数据表/流程/自动化/运算）
 *   左侧二级菜单：每个分类下的资源实例
 *   右侧内容区：顶部多 tab，下方为当前 tab 的设计器
 *
 * 交互：
 *   - 点击二级菜单 → 新增/切换 tab
 *   - 右键一级菜单 → 新建该类型的资源实例
 *
 * Route: /:tenantId/designer/:resourceType/:id
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { App, Layout, Tabs, Button, Spin, Dropdown, Modal, Input } from 'antd';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  FileOutlined,
  FormOutlined,
  TableOutlined,
  NodeIndexOutlined,
  ThunderboltOutlined,
  CalculatorOutlined,
  AppstoreOutlined,
  PlusOutlined,
  SettingOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { PageDesign } from '../designers';

const { Sider, Content } = Layout;

// ─── 类型 ──────────────────────────────────────────────────

/** 资源实例 */
interface ResourceItem {
  id: string;
  name: string;
  schemaVersion?: number;
  version?: number;
}

/** 已打开的 tab */
interface OpenTab {
  key: string;
  resourceType: string;
  resourceId: string;
  name: string;
}

// ─── 配置 ──────────────────────────────────────────────────

const RESOURCE_TYPES = [
  { key: 'pages', label: '页面', singular: 'page', icon: <FileOutlined /> },
  { key: 'cards', label: '卡片', singular: 'card', icon: <FormOutlined /> },
  { key: 'forms', label: '表单', singular: 'form', icon: <FormOutlined /> },
  { key: 'tables', label: '数据表', singular: 'table', icon: <TableOutlined /> },
  { key: 'workflows', label: '流程', singular: 'workflow', icon: <NodeIndexOutlined /> },
  { key: 'automations', label: '自动化', singular: 'automation', icon: <ThunderboltOutlined /> },
  { key: 'computations', label: '运算', singular: 'computation', icon: <CalculatorOutlined /> },
] as const;

/** 资源类型 key → 配置映射 */
const RESOURCE_TYPE_MAP = Object.fromEntries(RESOURCE_TYPES.map((r) => [r.key, r]));

// ─── 资源设计器（按类型分发） ─────────────────────────────────

function ResourceDesigner({ appId, resourceType, resourceId, onSaved }: {
  appId: string;
  resourceType: string;
  resourceId: string;
  /** 保存成功后的回调（用于更新 tab 名称和刷新资源列表） */
  onSaved?: (name: string) => void;
}) {
  // 页面类型：使用 PageDesign 组件
  if (resourceType === 'pages') {
    return <PageDesign appId={appId} pageId={resourceId} onSaved={onSaved} />;
  }

  // 其他类型：占位
  const config = RESOURCE_TYPE_MAP[resourceType];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <span style={{ fontSize: 48 }}>{config?.icon || '📦'}</span>
      <h2 style={{ color: '#1a1a2e' }}>{config?.label || resourceType}设计器</h2>
      <p style={{ color: '#8c8c8c' }}>资源 ID: {resourceId} · 即将上线</p>
    </div>
  );
}

// ─── 主组件 ─────────────────────────────────────────────────

export default function AppDesignPage() {
  const { tenantId, resourceType, id } = useParams<{ tenantId: string; resourceType: string; id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const tid = tenantId || '';
  const appId = id || '';

  const [loading, setLoading] = useState(true);
  const [appName, setAppName] = useState('');
  const [resources, setResources] = useState<Record<string, ResourceItem[]>>({});
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabKey, setActiveTabKey] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['pages']));
  const [siderCollapsed, setSiderCollapsed] = useState(false);
  const [newResourceModal, setNewResourceModal] = useState<{ open: boolean; type: string }>({
    open: false,
    type: '',
  });
  const [newResourceName, setNewResourceName] = useState('');
  const [pageLayout, setPageLayout] = useState<'grid' | 'flex'>('grid');
  const [gridColumns, setGridColumns] = useState(24);
  const [appConfigOpen, setAppConfigOpen] = useState(false);

  // 加载应用资源
  const loadApp = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/apps/${appId}`);
      const data = await resp.json();
      if (data.success) {
        setAppName(data.app?.name || '');
        setResources(data.resources || {});
      } else {
        message.error('应用不存在');
        navigate(`/${tid}/apps`);
      }
    } catch {
      message.error('加载应用失败');
      navigate(`/${tid}/apps`);
    } finally {
      setLoading(false);
    }
  }, [appId, tid, navigate]);

  useEffect(() => {
    loadApp();
  }, [loadApp]);

  // 点击二级菜单 → 打开/切换 tab
  const handleResourceClick = (resourceType: string, resourceId: string, resourceName: string) => {
    const tabKey = `${resourceType}:${resourceId}`;
    const existing = openTabs.find((t) => t.key === tabKey);
    if (!existing) {
      setOpenTabs((prev) => [...prev, {
        key: tabKey,
        resourceType,
        resourceId,
        name: resourceName,
      }]);
    }
    setActiveTabKey(tabKey);
    setSiderCollapsed(true); // 打开 tab 后收起侧边栏
  };

  // 关闭 tab
  const handleTabClose = (targetKey: string) => {
    const idx = openTabs.findIndex((t) => t.key === targetKey);
    const remaining = openTabs.filter((t) => t.key !== targetKey);
    setOpenTabs(remaining);
    if (activeTabKey === targetKey && remaining.length > 0) {
      setActiveTabKey(remaining[Math.min(idx, remaining.length - 1)].key);
    }
    // 所有 tab 关闭后展开侧边栏
    if (remaining.length === 0) {
      setSiderCollapsed(false);
    }
  };

  // 右键一级菜单 → 新建资源
  const handleContextMenu = (resourceType: string) => {
    setNewResourceModal({ open: true, type: resourceType });
    setNewResourceName('');
    setPageLayout('grid');
    setGridColumns(24);
  };

  // 确认新建资源
  const handleCreateResource = async () => {
    if (!newResourceName.trim()) {
      message.warning('请输入资源名称');
      return;
    }

    // 构建请求体
    const body: Record<string, any> = { name: newResourceName };
    if (newResourceModal.type === 'pages') {
      body.layout = {
        type: pageLayout,
        ...(pageLayout === 'grid' ? { columns: gridColumns, gap: 16 } : { vertical: true, gap: 16 }),
      };
    }

    try {
      const resp = await fetch(`/api/apps/${appId}/${newResourceModal.type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (data.success) {
        message.success(`创建成功: ${newResourceName}`);
        setNewResourceModal({ open: false, type: '' });
        loadApp();
        // 自动打开新创建的资源
        const tabKey = `${newResourceModal.type}:${data.resource.id}`;
        setOpenTabs((prev) => [...prev, {
          key: tabKey,
          resourceType: newResourceModal.type,
          resourceId: data.resource.id,
          name: data.resource.name,
        }]);
        setActiveTabKey(tabKey);
      } else {
        message.error(data.error || '创建失败');
      }
    } catch {
      message.error('创建失败');
    }
  };

  // 打开应用配置
  const handleEditMeta = () => {
    setAppConfigOpen(true);
  };

  // 删除资源
  const handleDeleteResource = async (resourceType: string, resourceId: string, resourceName: string) => {
    try {
      const resp = await fetch(`/api/apps/${appId}/${resourceType}/${resourceId}`, {
        method: 'DELETE',
      });
      const data = await resp.json();
      if (data.success) {
        message.success(`已删除: ${resourceName}`);
        // 关闭对应的 tab
        const tabKey = `${resourceType}:${resourceId}`;
        setOpenTabs((prev) => prev.filter((t) => t.key !== tabKey));
        if (activeTabKey === tabKey) {
          setActiveTabKey('');
        }
        loadApp();
      } else {
        message.error(data.error || '删除失败');
      }
    } catch {
      message.error('删除失败');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // 当前活动的 tab
  const activeTab = openTabs.find((t) => t.key === activeTabKey);

  // 展开/折叠
  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // 二级菜单点击处理
  function handleClick(resourceType: string, resourceId: string, resourceName: string) {
    handleResourceClick(resourceType, resourceId, resourceName);
  }

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Layout style={{ overflow: 'hidden' }}>
        {/* 左侧边栏 — 默认收起，鼠标悬浮展开 */}
        <Sider
          collapsed={siderCollapsed}
          collapsedWidth={48}
          width={240}
          onMouseEnter={() => setSiderCollapsed(false)}
          onMouseLeave={() => setSiderCollapsed(true)}
          style={{
            background: '#fff',
            borderRight: '1px solid #f0f0f0',
            height: '100vh',
            overflow: 'auto',
            transition: 'all 0.2s',
          }}
        >
          {/* 应用信息 + 返回 + 配置 */}
          <div
            style={{
              height: 48,
              display: 'flex',
              alignItems: 'center',
              padding: siderCollapsed ? '0 12px' : '0 12px',
              gap: siderCollapsed ? 0 : 8,
              borderBottom: '1px solid #f0f0f0',
              flexShrink: 0,
              justifyContent: siderCollapsed ? 'center' : 'flex-start',
            }}
          >
            {siderCollapsed ? (
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                size="small"
                onClick={() => navigate(-1)}
              />
            ) : (
              <>
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  size="small"
                  onClick={() => navigate(-1)}
                />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {appName}
                </span>
                <Button
                  type="text"
                  icon={<SettingOutlined />}
                  size="small"
                  onClick={handleEditMeta}
                />
              </>
            )}
          </div>

          {/* 资源分组菜单 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: siderCollapsed ? '8px 0' : '8px 0' }}>
            {RESOURCE_TYPES.map((rt) => {
              const isExpanded = expandedGroups.has(rt.key);
              const items = resources[rt.key] || [];
              return (
                <div key={rt.key}>
                  {/* 一级：资源类型（右键可新建） */}
                  <Dropdown
                    trigger={['contextMenu']}
                    menu={{
                      items: [{
                        key: 'new',
                        icon: <PlusOutlined />,
                        label: `新建${rt.label}`,
                        onClick: () => handleContextMenu(rt.key),
                      }],
                    }}
                  >
                    <div
                      onClick={() => toggleGroup(rt.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: siderCollapsed ? '10px 0' : '8px 12px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        gap: siderCollapsed ? 0 : 8,
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#1a1a2e',
                        justifyContent: siderCollapsed ? 'center' : 'flex-start',
                      }}
                      title={siderCollapsed ? rt.label : undefined}
                    >
                      {!siderCollapsed && (
                        isExpanded ? <DownOutlined style={{ fontSize: 10 }} /> : <RightOutlined style={{ fontSize: 10 }} />
                      )}
                      <span style={{ fontSize: siderCollapsed ? 18 : 15 }}>{rt.icon}</span>
                      {!siderCollapsed && (
                        <>
                          <span style={{ flex: 1 }}>{rt.label}</span>
                          <span style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 400 }}>{items.length}</span>
                        </>
                      )}
                    </div>
                  </Dropdown>

                  {/* 二级：资源实例列表（仅展开时显示） */}
                  {!siderCollapsed && isExpanded && items.map((res) => {
                    const tabKey = `${rt.key}:${res.id}`;
                    const isActive = activeTabKey === tabKey;
                    return (
                      <Dropdown
                        key={res.id}
                        trigger={['contextMenu']}
                        menu={{
                          items: [
                            {
                              key: 'open',
                              label: '打开',
                              onClick: () => handleClick(rt.key, res.id, res.name),
                            },
                            {
                              key: 'delete',
                              icon: <DeleteOutlined />,
                              label: '删除',
                              danger: true,
                              onClick: () => handleDeleteResource(rt.key, res.id, res.name),
                            },
                          ],
                        }}
                      >
                      <div
                        onClick={() => handleClick(rt.key, res.id, res.name)}
                        style={{
                          padding: '6px 12px 6px 40px',
                          cursor: 'pointer',
                          fontSize: 13,
                          color: isActive ? '#4f46e5' : '#595959',
                          background: isActive ? '#f0f0ff' : 'transparent',
                          borderRadius: 4,
                          margin: '1px 8px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {res.name}
                      </div>
                      </Dropdown>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </Sider>

        {/* 右侧内容区 */}
        <Layout style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Tab 栏 */}
          {openTabs.length > 0 && (
            <Tabs
              type="editable-card"
              hideAdd
              activeKey={activeTabKey}
              onChange={setActiveTabKey}
              onEdit={(targetKey, action) => {
                if (action === 'remove') handleTabClose(targetKey as string);
              }}
              style={{ background: '#fff', paddingLeft: 8, flexShrink: 0 }}
              items={openTabs.map((tab) => ({
                key: tab.key,
                label: tab.name,
                closable: true,
              }))}
            />
          )}

          {/* 设计器内容 */}
          <Content style={{ background: '#f5f5f5', overflow: 'auto', position: 'relative', flex: 1 }}>
            {activeTab ? (
              <ResourceDesigner
                appId={appId}
                resourceType={activeTab.resourceType}
                resourceId={activeTab.resourceId}
                onSaved={(newName) => {
                  // 更新 tab 名称
                  setOpenTabs((prev) => prev.map((t) =>
                    t.key === activeTabKey ? { ...t, name: newName } : t,
                  ));
                  // 刷新侧边栏资源列表
                  loadApp();
                }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#bfbfbf',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <AppstoreOutlined style={{ fontSize: 48 }} />
                <span>点击左侧资源开始设计</span>
              </div>
            )}
          </Content>
        </Layout>
      </Layout>

      {/* 新建资源弹框 */}
      <Modal
        title={`新建${RESOURCE_TYPE_MAP[newResourceModal.type]?.label || ''}`}
        open={newResourceModal.open}
        onOk={handleCreateResource}
        onCancel={() => setNewResourceModal({ open: false, type: '' })}
        okText="创建"
        cancelText="取消"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            placeholder="资源名称"
            value={newResourceName}
            onChange={(e) => setNewResourceName(e.target.value)}
            onPressEnter={handleCreateResource}
            autoFocus
          />

          {/* 页面类型：布局选择 */}
          {newResourceModal.type === 'pages' && (
            <div>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>布局类型</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div
                  onClick={() => setPageLayout('grid')}
                  style={{
                    flex: 1,
                    padding: 16,
                    border: `2px solid ${pageLayout === 'grid' ? '#4f46e5' : '#f0f0f0'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'center',
                    background: pageLayout === 'grid' ? '#f5f3ff' : '#fff',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>⊞</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>栅格布局</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>适合复杂表单、仪表盘</div>
                </div>
                <div
                  onClick={() => setPageLayout('flex')}
                  style={{
                    flex: 1,
                    padding: 16,
                    border: `2px solid ${pageLayout === 'flex' ? '#4f46e5' : '#f0f0f0'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'center',
                    background: pageLayout === 'flex' ? '#f5f3ff' : '#fff',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>☰</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>弹性布局</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>适合流式排列、响应式</div>
                </div>
              </div>

              {/* 栅格列数 */}
              {pageLayout === 'grid' && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ marginBottom: 8, fontSize: 13 }}>栅格列数</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[12, 16, 24].map((col) => (
                      <div
                        key={col}
                        onClick={() => setGridColumns(col)}
                        style={{
                          padding: '6px 16px',
                          border: `1px solid ${gridColumns === col ? '#4f46e5' : '#d9d9d9'}`,
                          borderRadius: 6,
                          cursor: 'pointer',
                          background: gridColumns === col ? '#f5f3ff' : '#fff',
                          fontSize: 13,
                        }}
                      >
                        {col} 列
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* 应用配置弹框 */}
      <Modal
        title="应用配置"
        open={appConfigOpen}
        onCancel={() => setAppConfigOpen(false)}
        footer={null}
      >
        <p style={{ color: '#8c8c8c' }}>应用级配置功能即将上线</p>
      </Modal>
    </Layout>
  );
}
