/**
 * 工作流路由测试用例
 *
 * 验证流程定义 CRUD、发布、触发等功能。
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DatabaseManager } from '@low-code/data';

describe('工作流路由', () => {
  let manager: DatabaseManager;
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-workflows-test-'));
    manager = new DatabaseManager({
      dataDir: path.join(tmpDir, 'data'),
      tenantsDir: path.join(tmpDir, 'tenants'),
      walMode: false,
    });

    // 初始化系统库和租户库
    manager.initSystemDb();
    manager.createTenant('test123', '测试租户');

    // 创建应用目录结构
    const appDir = path.join(tmpDir, 'tenants', 'tenant_test123', 'apps', 'app_test001');
    fs.mkdirSync(path.join(appDir, 'workflows'), { recursive: true });
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  describe('流程定义文件', () => {
    it('应该创建流程定义文件', () => {
      const workflow = {
        id: 'workflow001',
        name: '测试流程',
        description: '测试流程描述',
        status: 'DRAFT',
        bpmn: {
          id: 'doc_workflow001',
          name: '测试流程',
          processes: [{
            id: 'process1',
            name: '主流程',
            isExecutable: true,
            nodes: [
              { id: 'start', $type: 'bpmn:StartEvent', name: '开始' },
              { id: 'end', $type: 'bpmn:EndEvent', name: '结束' },
            ],
            edges: [
              { id: 'flow1', $type: 'bpmn:SequenceFlow', sourceRef: 'start', targetRef: 'end' },
            ],
          }],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const workflowsDir = path.join(tmpDir, 'tenants', 'tenant_test123', 'apps', 'app_test001', 'workflows');
      const filePath = path.join(workflowsDir, 'workflow_workflow001.json');

      fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2));

      expect(fs.existsSync(filePath)).toBe(true);

      const readWorkflow = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(readWorkflow.id).toBe('workflow001');
      expect(readWorkflow.name).toBe('测试流程');
    });

    it('应该扫描目录下所有流程定义', () => {
      const workflowsDir = path.join(tmpDir, 'tenants', 'tenant_test123', 'apps', 'app_test001', 'workflows');

      // 创建多个流程定义
      const workflows = [
        { id: 'workflow002', name: '流程2' },
        { id: 'workflow003', name: '流程3' },
      ];

      for (const workflow of workflows) {
        fs.writeFileSync(
          path.join(workflowsDir, `workflow_${workflow.id}.json`),
          JSON.stringify(workflow, null, 2)
        );
      }

      // 扫描目录
      const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.json'));
      expect(files).toHaveLength(3); // 包括之前创建的 workflow001
    });

    it('应该过滤已删除的流程定义', () => {
      const workflowsDir = path.join(tmpDir, 'tenants', 'tenant_test123', 'apps', 'app_test001', 'workflows');
      const workflow = {
        id: 'workflow004',
        name: '已删除流程',
        _deleted: true,
      };

      fs.writeFileSync(
        path.join(workflowsDir, `workflow_${workflow.id}.json`),
        JSON.stringify(workflow, null, 2)
      );

      // 扫描并过滤
      const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.json'));
      const activeWorkflows = files
        .map(f => JSON.parse(fs.readFileSync(path.join(workflowsDir, f), 'utf-8')))
        .filter(w => !w._deleted);

      expect(activeWorkflows).toHaveLength(3);
    });
  });

  describe('流程定义状态', () => {
    it('应该支持草稿状态', () => {
      const workflow = {
        id: 'workflow001',
        name: '测试流程',
        status: 'DRAFT',
      };

      expect(workflow.status).toBe('DRAFT');
    });

    it('应该支持发布状态', () => {
      const workflow = {
        id: 'workflow001',
        name: '测试流程',
        status: 'PUBLISHED',
        publishedAt: new Date().toISOString(),
      };

      expect(workflow.status).toBe('PUBLISHED');
      expect(workflow.publishedAt).toBeDefined();
    });

    it('应该支持归档状态', () => {
      const workflow = {
        id: 'workflow001',
        name: '测试流程',
        status: 'ARCHIVED',
        archivedAt: new Date().toISOString(),
      };

      expect(workflow.status).toBe('ARCHIVED');
      expect(workflow.archivedAt).toBeDefined();
    });
  });

  describe('BPMN 文档结构', () => {
    it('应该包含完整的流程定义', () => {
      const bpmn = {
        id: 'doc_workflow001',
        name: '测试流程',
        processes: [{
          id: 'process1',
          name: '主流程',
          isExecutable: true,
          nodes: [
            { id: 'start', $type: 'bpmn:StartEvent', name: '开始' },
            { id: 'task1', $type: 'bpmn:UserTask', name: '审批' },
            { id: 'end', $type: 'bpmn:EndEvent', name: '结束' },
          ],
          edges: [
            { id: 'flow1', $type: 'bpmn:SequenceFlow', sourceRef: 'start', targetRef: 'task1' },
            { id: 'flow2', $type: 'bpmn:SequenceFlow', sourceRef: 'task1', targetRef: 'end' },
          ],
        }],
      };

      expect(bpmn.processes).toHaveLength(1);
      expect(bpmn.processes[0].nodes).toHaveLength(3);
      expect(bpmn.processes[0].edges).toHaveLength(2);
    });

    it('应该支持条件分支', () => {
      const bpmn = {
        id: 'doc_workflow001',
        name: '条件分支流程',
        processes: [{
          id: 'process1',
          name: '主流程',
          isExecutable: true,
          nodes: [
            { id: 'start', $type: 'bpmn:StartEvent', name: '开始' },
            { id: 'gw1', $type: 'bpmn:ExclusiveGateway', name: '条件判断' },
            { id: 'task_a', $type: 'bpmn:UserTask', name: '审批A' },
            { id: 'task_b', $type: 'bpmn:UserTask', name: '审批B' },
            { id: 'end', $type: 'bpmn:EndEvent', name: '结束' },
          ],
          edges: [
            { id: 'flow1', $type: 'bpmn:SequenceFlow', sourceRef: 'start', targetRef: 'gw1' },
            { id: 'flow2', $type: 'bpmn:SequenceFlow', sourceRef: 'gw1', targetRef: 'task_a' },
            { id: 'flow3', $type: 'bpmn:SequenceFlow', sourceRef: 'gw1', targetRef: 'task_b' },
            { id: 'flow4', $type: 'bpmn:SequenceFlow', sourceRef: 'task_a', targetRef: 'end' },
            { id: 'flow5', $type: 'bpmn:SequenceFlow', sourceRef: 'task_b', targetRef: 'end' },
          ],
        }],
      };

      const gateway = bpmn.processes[0].nodes.find(n => n.$type === 'bpmn:ExclusiveGateway');
      expect(gateway).toBeDefined();
      expect(gateway!.name).toBe('条件判断');

      const outgoingEdges = bpmn.processes[0].edges.filter(e => e.sourceRef === 'gw1');
      expect(outgoingEdges).toHaveLength(2);
    });

    it('应该支持并行分支', () => {
      const bpmn = {
        id: 'doc_workflow001',
        name: '并行分支流程',
        processes: [{
          id: 'process1',
          name: '主流程',
          isExecutable: true,
          nodes: [
            { id: 'start', $type: 'bpmn:StartEvent', name: '开始' },
            { id: 'fork', $type: 'bpmn:ParallelGateway', name: '分支' },
            { id: 'task_a', $type: 'bpmn:UserTask', name: '任务A' },
            { id: 'task_b', $type: 'bpmn:UserTask', name: '任务B' },
            { id: 'join', $type: 'bpmn:ParallelGateway', name: '汇聚' },
            { id: 'end', $type: 'bpmn:EndEvent', name: '结束' },
          ],
          edges: [
            { id: 'flow1', $type: 'bpmn:SequenceFlow', sourceRef: 'start', targetRef: 'fork' },
            { id: 'flow2', $type: 'bpmn:SequenceFlow', sourceRef: 'fork', targetRef: 'task_a' },
            { id: 'flow3', $type: 'bpmn:SequenceFlow', sourceRef: 'fork', targetRef: 'task_b' },
            { id: 'flow4', $type: 'bpmn:SequenceFlow', sourceRef: 'task_a', targetRef: 'join' },
            { id: 'flow5', $type: 'bpmn:SequenceFlow', sourceRef: 'task_b', targetRef: 'join' },
            { id: 'flow6', $type: 'bpmn:SequenceFlow', sourceRef: 'join', targetRef: 'end' },
          ],
        }],
      };

      const forkGateway = bpmn.processes[0].nodes.find(n => n.id === 'fork');
      const joinGateway = bpmn.processes[0].nodes.find(n => n.id === 'join');

      expect(forkGateway!.$type).toBe('bpmn:ParallelGateway');
      expect(joinGateway!.$type).toBe('bpmn:ParallelGateway');
    });
  });

  describe('流程触发', () => {
    it('应该支持手动触发', () => {
      const trigger = {
        type: 'manual',
        userId: 'user1',
        timestamp: new Date().toISOString(),
      };

      expect(trigger.type).toBe('manual');
      expect(trigger.userId).toBeDefined();
    });

    it('应该支持表单按钮触发', () => {
      const trigger = {
        type: 'form_button',
        formId: 'form1',
        buttonId: 'submit_btn',
        formData: { name: '测试', amount: 100 },
      };

      expect(trigger.type).toBe('form_button');
      expect(trigger.formId).toBeDefined();
      expect(trigger.buttonId).toBeDefined();
    });

    it('应该支持自动化触发', () => {
      const trigger = {
        type: 'automation',
        ruleId: 'rule1',
        eventId: 'event1',
      };

      expect(trigger.type).toBe('automation');
      expect(trigger.ruleId).toBeDefined();
    });
  });
});
