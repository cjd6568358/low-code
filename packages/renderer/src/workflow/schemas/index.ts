/**
 * 流程节点配置 Schema 索引
 *
 * 每种节点类型对应一个 JSON Schema，用于 AutoFormRenderer 自动渲染配置面板。
 */

import approvalSchema from './approval.json';
import conditionSchema from './condition.json';
import timerSchema from './timer.json';
import notifySchema from './notify.json';
import serviceSchema from './service.json';
import calculationSchema from './calculation.json';
import dataOperationSchema from './data-operation.json';

/** 节点配置 Schema Map */
export const NODE_CONFIG_SCHEMAS: Record<string, any> = {
  approval: approvalSchema,
  condition: conditionSchema,
  timer: timerSchema,
  notify: notifySchema,
  service: serviceSchema,
  calculation: calculationSchema,
  create: dataOperationSchema,
  update: dataOperationSchema,
  delete: dataOperationSchema,
};

/**
 * 获取节点配置 Schema
 * @param nodeType 节点类型
 * @returns JSON Schema
 */
export function getNodeConfigSchema(nodeType: string): any {
  return NODE_CONFIG_SCHEMAS[nodeType] || {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        title: '节点名称',
      },
    },
  };
}

export {
  approvalSchema,
  conditionSchema,
  timerSchema,
  notifySchema,
  serviceSchema,
  calculationSchema,
  dataOperationSchema,
};
