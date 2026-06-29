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
  TableOutlined,
  NodeIndexOutlined,
  ThunderboltOutlined,
  CalculatorOutlined,
  AppstoreOutlined,
  PlusOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { PageDesign, TableDesign, WorkflowDesign } from '../designers';
import { PageComponentPicker, type PageComponentPickResult } from '../designers/components/PageComponentPicker';
import { ThemeConfigPanel, type ThemeConfig } from '../components/ThemeConfigPanel';

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
  { key: 'cards', label: '卡片', singular: 'card', icon: <AppstoreOutlined /> },
  { key: 'tables', label: '数据表', singular: 'table', icon: <TableOutlined /> },
  { key: 'workflows', label: '流程', singular: 'workflow', icon: <NodeIndexOutlined /> },
  { key: 'automations', label: '自动化', singular: 'automation', icon: <ThunderboltOutlined /> },
  { key: 'computations', label: '运算', singular: 'computation', icon: <CalculatorOutlined /> },
] as const;

/** 资源类型 key → 配置映射 */
const RESOURCE_TYPE_MAP = Object.fromEntries(RESOURCE_TYPES.map((r) => [r.key, r]));

// ─── 资源设计器（按类型分发） ─────────────────────────────────

function ResourceDesigner({ tenantId, appId, resourceType, resourceId, onSaved }: {
  tenantId: string;
  appId: string;
  resourceType: string;
  resourceId: string;
  /** 保存成功后的回调（用于更新 tab 名称和刷新资源列表） */
  onSaved?: (name: string) => void;
}) {
  // 页面类型：使用 PageDesign 组件
  if (resourceType === 'pages') {
    return <PageDesign appId={appId} pageId={resourceId} tenantId={tenantId} onSaved={onSaved} />;
  }

  // 数据表类型：使用 TableDesign 组件
  if (resourceType === 'tables') {
    return <TableDesign appId={appId} tableId={resourceId} onSaved={onSaved} />;
  }

  // 流程类型：使用 WorkflowDesign 组件
  if (resourceType === 'workflows') {
    return <WorkflowDesign appId={appId} workflowId={resourceId} onSaved={onSaved} />;
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
  const [activeGroup, setActiveGroup] = useState<string>('pages');
  const [siderCollapsed, setSiderCollapsed] = useState(false);
  const [newResourceModal, setNewResourceModal] = useState<{ open: boolean; type: string }>({
    open: false,
    type: '',
  });
  const [newResourceName, setNewResourceName] = useState('');
  const [pageLayout, setPageLayout] = useState<'grid' | 'flex'>('grid');
  const [gridColumns, setGridColumns] = useState(24);
  const [appConfigOpen, setAppConfigOpen] = useState(false);
  const [appTheme, setAppTheme] = useState<Partial<ThemeConfig>>({});
  const [tableCreateMode, setTableCreateMode] = useState<'blank' | 'fromPage'>('blank');
  const [pagePickerVisible, setPagePickerVisible] = useState(false);

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
    setTableCreateMode('blank');
  };

  // 确认新建资源
  const handleCreateResource = async () => {
    if (!newResourceName.trim()) {
      message.warning('请输入资源名称');
      return;
    }

    // 数据表 + 从页面创建：打开页面选择器
    if (newResourceModal.type === 'tables' && tableCreateMode === 'fromPage') {
      setNewResourceModal({ open: false, type: '' });
      setPagePickerVisible(true);
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

  // 从页面创建数据表
  const handleCreateTableFromPage = async (result: PageComponentPickResult) => {
    try {
      // 先创建空白数据表
      const resp = await fetch(`/api/apps/${appId}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newResourceName }),
      });
      const data = await resp.json();
      if (!data.success) {
        message.error(data.error || '创建失败');
        return;
      }

      // 加载完整 schema 并注入字段
      const tableId = data.resource.id;
      const loadResp = await fetch(`/api/apps/${appId}/tables/${tableId}`);
      const loadData = await loadResp.json();

      if (loadData.success && loadData.resource) {
        const tableSchema = loadData.resource;
        tableSchema.sourcePageId = result.pageId;
        tableSchema.columns = result.fields.map((field) => ({
          id: crypto.randomUUID().slice(0, 8),
          fieldName: field.fieldName,
          fieldType: field.fieldType,
          required: field.required,
          sourceMapping: {
            componentId: field.componentId,
            componentProp: field.propName,
          },
        }));

        const saveResp = await fetch(`/api/apps/${appId}/tables/${tableId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tableSchema),
        });
        const saveData = await saveResp.json();
        if (!saveResp.ok || !saveData.success) {
          throw new Error(saveData.error || '保存字段失败');
        }
      }

      message.success(`创建成功: ${newResourceName}（${result.fields.length} 个字段）`);
      setPagePickerVisible(false);
      loadApp();

      // 自动打开新创建的资源
      const tabKey = `tables:${tableId}`;
      setOpenTabs((prev) => [...prev, {
        key: tabKey,
        resourceType: 'tables',
        resourceId: tableId,
        name: newResourceName,
      }]);
      setActiveTabKey(tabKey);
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
            overflow: 'hidden',
            transition: 'all 0.2s',
          }}
        >
          {/* 撑满包裹层（antd Sider 的 .ant-layout-sider-children 不自带 height:100%） */}
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* 应用信息 + 返回 */}
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
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              size="small"
              onClick={() => navigate(-1)}
            />
            {!siderCollapsed && (
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {appName}
              </span>
            )}
          </div>

          {/* 垂直 Tabs — 资源分类 */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {/* 左侧 Tab 栏 */}
            <div style={{
              width: 48,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px 0',
              gap: 2,
              overflowY: 'auto',
            }}>
              {RESOURCE_TYPES.map((rt) => {
                const isActive = activeGroup === rt.key;
                const count = (resources[rt.key] || []).length;
                return (
                  <Dropdown
                    key={rt.key}
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
                      onClick={() => setActiveGroup(rt.key)}
                      style={{
                        width: 48,
                        padding: '6px 0',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        borderRadius: 6,
                        color: isActive ? '#4f46e5' : '#595959',
                        background: isActive ? '#f0f0ff' : 'transparent',
                        position: 'relative',
                        transition: 'all 0.15s',
                        gap: 2,
                      }}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1 }}>{rt.icon}</span>
                      <span style={{ fontSize: 10, lineHeight: 1 }}>{rt.label}</span>
                      {count > 0 && (
                        <span style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          fontSize: 8,
                          color: isActive ? '#4f46e5' : '#8c8c8c',
                          lineHeight: 1,
                        }}>
                          {count}
                        </span>
                      )}
                    </div>
                  </Dropdown>
                );
              })}
              {/* 应用设置（底部） */}
              <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                <div
                  onClick={handleEditMeta}
                  title="应用设置"
                  style={{
                    width: 40,
                    height: 40,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    borderRadius: 6,
                    fontSize: 16,
                    color: '#595959',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f5f5f5'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <SettingOutlined />
                </div>
              </div>
            </div>

            {/* 右侧资源列表 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
                paddingLeft: 4,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#262626' }}>
                  {RESOURCE_TYPE_MAP[activeGroup]?.label || activeGroup}
                </span>
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => handleContextMenu(activeGroup)}
                />
              </div>
              {(resources[activeGroup] || []).map((res) => {
                const tabKey = `${activeGroup}:${res.id}`;
                const isActive = activeTabKey === tabKey;
                return (
                  <Dropdown
                    key={res.id}
                    trigger={['contextMenu']}
                    menu={{
                      items: [
                        { key: 'open', label: '打开', onClick: () => handleClick(activeGroup, res.id, res.name) },
                        { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true, onClick: () => handleDeleteResource(activeGroup, res.id, res.name) },
                      ],
                    }}
                  >
                    <div
                      onClick={() => handleClick(activeGroup, res.id, res.name)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: 13,
                        color: isActive ? '#4f46e5' : '#595959',
                        background: isActive ? '#f0f0ff' : 'transparent',
                        borderRadius: 6,
                        marginBottom: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        borderLeft: isActive ? '2px solid #4f46e5' : '2px solid transparent',
                      }}
                    >
                      {res.name}
                    </div>
                  </Dropdown>
                );
              })}
              {(resources[activeGroup] || []).length === 0 && (
                <div style={{ textAlign: 'center', color: '#bfbfbf', fontSize: 12, padding: '24px 0' }}>
                  暂无资源，右键或点击 + 新建
                </div>
              )}
            </div>
          </div>
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
                tenantId={tid}
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

          {/* 数据表类型：创建方式选择 */}
          {newResourceModal.type === 'tables' && (
            <div>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>创建方式</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div
                  onClick={() => setTableCreateMode('blank')}
                  style={{
                    flex: 1,
                    padding: 16,
                    border: `2px solid ${tableCreateMode === 'blank' ? '#4f46e5' : '#f0f0f0'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'center',
                    background: tableCreateMode === 'blank' ? '#f5f3ff' : '#fff',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>📋</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>空白创建</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>从零开始定义字段</div>
                </div>
                <div
                  onClick={() => setTableCreateMode('fromPage')}
                  style={{
                    flex: 1,
                    padding: 16,
                    border: `2px solid ${tableCreateMode === 'fromPage' ? '#4f46e5' : '#f0f0f0'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'center',
                    background: tableCreateMode === 'fromPage' ? '#f5f3ff' : '#fff',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>🔗</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>从页面创建</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>自动提取页面组件</div>
                </div>
              </div>
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
        width={520}
      >
        <Tabs
          defaultActiveKey="theme"
          items={[
            {
              key: 'theme',
              label: '主题',
              children: (
                <ThemeConfigPanel
                  value={appTheme}
                  onChange={setAppTheme}
                />
              ),
            },
            {
              key: 'basic',
              label: '基本信息',
              children: <p style={{ color: '#8c8c8c' }}>基本信息配置即将上线</p>,
            },
          ]}
        />
      </Modal>

      {/* 从页面创建数据表 — 页面组件选择器 */}
      <PageComponentPicker
        appId={appId}
        visible={pagePickerVisible}
        onConfirm={handleCreateTableFromPage}
        onCancel={() => setPagePickerVisible(false)}
      />
    </Layout>
  );
}
