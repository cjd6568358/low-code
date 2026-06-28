/**
 * WorkflowEngine 端到端测试
 *
 * 测试完整的流程生命周期：启动 → 审批 → 结束
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { WorkflowEngine, WorkflowError } from '@low-code/workflow';
import { FileDatabaseAdapter } from '../services/FileDatabaseAdapter.js';
import { FileSnapshotService } from '../services/FileSnapshotService.js';
import type { BpmnDocument } from '@low-code/workflow-bpmn';

/** 创建测试用流程定义 */
function createApprovalWorkflow(): BpmnDocument {
  return {
    id: 'doc_approval',
    name: '审批流程',
    processes: [{
      id: 'process_approval',
      name: '审批流程',
      isExecutable: true,
      nodes: [
        {
          id: 'start',
          $type: 'bpmn:StartEvent',
          name: '开始',
          outgoing: ['flow1'],
        },
        {
          id: 'approval',
          $type: 'bpmn:UserTask',
          name: '部门经理审批',
          assignee: 'manager',
          incoming: ['flow1'],
          outgoing: ['flow2'],
        },
        {
          id: 'end',
          $type: 'bpmn:EndEvent',
          name: '结束',
          incoming: ['flow2'],
        },
      ],
      edges: [
        { id: 'flow1', $type: 'bpmn:SequenceFlow', sourceRef: 'start', targetRef: 'approval' },
        { id: 'flow2', $type: 'bpmn:SequenceFlow', sourceRef: 'approval', targetRef: 'end' },
      ],
    }],
  };
}

/** 创建条件分支流程定义 */
function createConditionalWorkflow(): BpmnDocument {
  return {
    id: 'doc_conditional',
    name: '条件分支流程',
    processes: [{
      id: 'process_conditional',
      name: '条件分支流程',
      isExecutable: true,
      nodes: [
        {
          id: 'start',
          $type: 'bpmn:StartEvent',
          name: '开始',
          outgoing: ['flow1'],
        },
        {
          id: 'gateway',
          $type: 'bpmn:ExclusiveGateway',
          name: '金额判断',
          incoming: ['flow1'],
          outgoing: ['flow2', 'flow3'],
        },
        {
          id: 'manager_approval',
          $type: 'bpmn:UserTask',
          name: '经理审批',
          assignee: 'manager',
          incoming: ['flow2'],
          outgoing: ['flow4'],
        },
        {
          id: 'director_approval',
          $type: 'bpmn:UserTask',
          name: '总监审批',
          assignee: 'director',
          incoming: ['flow3'],
          outgoing: ['flow5'],
        },
        {
          id: 'end',
          $type: 'bpmn:EndEvent',
          name: '结束',
          incoming: ['flow4', 'flow5'],
        },
      ],
      edges: [
        { id: 'flow1', $type: 'bpmn:SequenceFlow', sourceRef: 'start', targetRef: 'gateway' },
        {
          id: 'flow2',
          $type: 'bpmn:SequenceFlow',
          sourceRef: 'gateway',
          targetRef: 'manager_approval',
          conditionExpression: {
            id: 'expr1',
            $type: 'bpmn:FormalExpression',
            body: '${amount <= 10000}',
          },
        },
        {
          id: 'flow3',
          $type: 'bpmn:SequenceFlow',
          sourceRef: 'gateway',
          targetRef: 'director_approval',
          conditionExpression: {
            id: 'expr2',
            $type: 'bpmn:FormalExpression',
            body: '${amount > 10000}',
          },
        },
        { id: 'flow4', $type: 'bpmn:SequenceFlow', sourceRef: 'manager_approval', targetRef: 'end' },
        { id: 'flow5', $type: 'bpmn:SequenceFlow', sourceRef: 'director_approval', targetRef: 'end' },
      ],
    }],
  };
}

describe('WorkflowEngine 端到端测试', () => {
  let engine: WorkflowEngine;
  let tempDir: string;
  let db: FileDatabaseAdapter;
  let snapshotService: FileSnapshotService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-e2e-'));
    db = new FileDatabaseAdapter(tempDir);
    snapshotService = new FileSnapshotService(tempDir);

    engine = new WorkflowEngine({
      db,
      snapshotService,
    });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('简单审批流程', () => {
    it('应该完成完整的审批流程', async () => {
      // 1. 通过数据库插入流程定义
      await db.run(
        `INSERT INTO workflow_definitions (id, workflow_key, version, name, schema, status) VALUES (?, ?, ?, ?, ?, ?)`,
        ['wf_approval', 'wf_approval', 1, '审批流程', JSON.stringify(createApprovalWorkflow()), 'PUBLISHED']
      );

      // 2. 启动流程
      const instance = await engine.start({
        workflowId: 'wf_approval',
        sourceTable: 'orders',
        sourceId: 'order_001',
        variables: { amount: 5000, applicant: '张三' },
        startedBy: 'user1',
        startedByName: '张三',
      });

      console.log('Instance:', JSON.stringify(instance, null, 2));

      // 检查任务文件
      const tasksDir = path.join(tempDir, 'tasks');
      if (fs.existsSync(tasksDir)) {
        const taskFiles = fs.readdirSync(tasksDir);
        console.log('Task files:', taskFiles);
        for (const file of taskFiles) {
          const content = JSON.parse(fs.readFileSync(path.join(tasksDir, file), 'utf-8'));
          console.log('Task file content:', file, JSON.stringify(content, null, 2));
        }
      }

      expect(instance).toBeDefined();
      expect(instance.status).toBe('running');
      expect(instance.workflowKey).toBe('wf_approval');

      // 3. 验证创建了审批任务
      const tasks = await engine.getPendingTasks('manager');
      expect(tasks).toHaveLength(1);
      expect(tasks[0].nodeId).toBe('approval');
      expect(tasks[0].assigneeId).toBe('manager');

      // 4. 审批通过
      const completedInstance = await engine.complete({
        taskId: tasks[0].id,
        operatorId: 'manager',
        operatorName: '经理',
        formData: { approvalRemark: '同意' },
        comment: '同意申请',
      });

      // 5. 验证流程完成
      expect(completedInstance.status).toBe('completed');

      // 6. 验证快照已创建
      const snapshots = await snapshotService.getChain(instance.id);
      expect(snapshots.length).toBeGreaterThanOrEqual(2); // INITIAL + FINAL
    });

    it('应该支持驳回操作', async () => {
      // 准备流程定义
      await db.run(
        `INSERT INTO workflow_definitions (id, workflow_key, version, name, schema, status) VALUES (?, ?, ?, ?, ?, ?)`,
        ['wf_approval', 'wf_approval', 1, '审批流程', JSON.stringify(createApprovalWorkflow()), 'PUBLISHED']
      );

      // 启动流程
      const instance = await engine.start({
        workflowId: 'wf_approval',
        sourceTable: 'orders',
        sourceId: 'order_001',
        variables: { amount: 5000 },
        startedBy: 'user1',
      });

      // 获取任务
      const tasks = await engine.getPendingTasks('manager');
      expect(tasks).toHaveLength(1);

      // 驳回
      const rejectedInstance = await engine.reject({
        taskId: tasks[0].id,
        operatorId: 'manager',
        comment: '金额不合理',
      });

      // 验证驳回快照
      const snapshots = await snapshotService.getChain(instance.id);
      const rejectSnapshot = snapshots.find(s => s.snapshotType === 'NODE_REJECT');
      expect(rejectSnapshot).toBeDefined();
      expect(rejectSnapshot?.comment).toBe('金额不合理');
    });
  });

  describe('条件分支流程', () => {
    it('应该根据条件走不同分支', async () => {
      // 准备流程定义
      await db.run(
        `INSERT INTO workflow_definitions (id, workflow_key, version, name, schema, status) VALUES (?, ?, ?, ?, ?, ?)`,
        ['wf_conditional', 'wf_conditional', 1, '条件分支流程', JSON.stringify(createConditionalWorkflow()), 'PUBLISHED']
      );

      // 启动流程（金额 <= 10000，走经理审批）
      const instance = await engine.start({
        workflowId: 'wf_conditional',
        sourceTable: 'orders',
        sourceId: 'order_001',
        variables: { amount: 5000 },
        startedBy: 'user1',
      });

      // 应该创建经理审批任务
      const managerTasks = await engine.getPendingTasks('manager');
      expect(managerTasks).toHaveLength(1);
      expect(managerTasks[0].nodeId).toBe('manager_approval');

      // 总监应该没有任务
      const directorTasks = await engine.getPendingTasks('director');
      expect(directorTasks).toHaveLength(0);
    });
  });

  describe('错误处理', () => {
    it('应该抛出错误当流程定义不存在', async () => {
      await expect(
        engine.start({
          workflowId: 'nonexistent',
          startedBy: 'user1',
        })
      ).rejects.toThrow(WorkflowError);
    });

    it('应该抛出错误当任务不存在', async () => {
      await expect(
        engine.complete({
          taskId: 'nonexistent',
          operatorId: 'user1',
        })
      ).rejects.toThrow(WorkflowError);
    });
  });

  describe('快照机制', () => {
    it('应该捕获初始快照', async () => {
      // 准备流程定义
      await db.run(
        `INSERT INTO workflow_definitions (id, workflow_key, version, name, schema, status) VALUES (?, ?, ?, ?, ?, ?)`,
        ['wf_approval', 'wf_approval', 1, '审批流程', JSON.stringify(createApprovalWorkflow()), 'PUBLISHED']
      );

      // 启动流程
      const instance = await engine.start({
        workflowId: 'wf_approval',
        sourceTable: 'orders',
        sourceId: 'order_001',
        variables: { amount: 5000 },
        startedBy: 'user1',
        startedByName: '张三',
      });

      // 验证初始快照
      const snapshots = await snapshotService.getChain(instance.id);
      expect(snapshots.length).toBeGreaterThanOrEqual(1);

      const initialSnapshot = snapshots.find(s => s.snapshotType === 'INITIAL');
      expect(initialSnapshot).toBeDefined();
      expect(initialSnapshot?.data).toEqual({ amount: 5000 });
    });

    it('应该追踪数据变更', async () => {
      // 准备流程定义
      await db.run(
        `INSERT INTO workflow_definitions (id, workflow_key, version, name, schema, status) VALUES (?, ?, ?, ?, ?, ?)`,
        ['wf_approval', 'wf_approval', 1, '审批流程', JSON.stringify(createApprovalWorkflow()), 'PUBLISHED']
      );

      // 启动流程
      const instance = await engine.start({
        workflowId: 'wf_approval',
        sourceTable: 'orders',
        sourceId: 'order_001',
        variables: { amount: 5000 },
        startedBy: 'user1',
      });

      // 获取任务并审批
      const tasks = await engine.getPendingTasks('manager');
      await engine.complete({
        taskId: tasks[0].id,
        operatorId: 'manager',
        formData: { amount: 6000, approvalRemark: '同意' },
      });

      // 验证变更追踪
      const snapshots = await snapshotService.getChain(instance.id);
      const completeSnapshot = snapshots.find(s => s.snapshotType === 'NODE_COMPLETE');
      expect(completeSnapshot).toBeDefined();
      expect(completeSnapshot?.changedFields).toBeDefined();
    });
  });
});
