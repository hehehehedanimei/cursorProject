"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStepsForTask = generateStepsForTask;
const connection_1 = require("../database/connection");
// 非核心组上线流程步骤定义
const NON_CORE_DEPLOYMENT_STEPS = [
    {
        stepName: '关闭自动加载开关',
        stepType: 'config',
        estimatedDuration: 5,
        dependencies: '[]'
    },
    {
        stepName: '检查目标版本数据',
        stepType: 'verify',
        estimatedDuration: 10,
        dependencies: '[1]'
    },
    {
        stepName: '切流量至IDC2',
        stepType: 'switch',
        estimatedDuration: 5,
        dependencies: '[2]'
    },
    {
        stepName: '部署国内非核心 IDC1 DS A组',
        stepType: 'deploy',
        estimatedDuration: 30,
        dependencies: '[3]'
    },
    {
        stepName: '切DS服务至A组',
        stepType: 'switch',
        estimatedDuration: 5,
        dependencies: '[4]'
    },
    {
        stepName: '部署国内非核心 IDC1 DS B组',
        stepType: 'deploy',
        estimatedDuration: 25,
        dependencies: '[5]'
    },
    {
        stepName: '部署国内非核心 IDC1 Service',
        stepType: 'deploy',
        estimatedDuration: 20,
        dependencies: '[6]'
    },
    {
        stepName: '服务预热验证',
        stepType: 'verify',
        estimatedDuration: 15,
        dependencies: '[7]'
    },
    {
        stepName: '逐步切流量至IDC1',
        stepType: 'switch',
        estimatedDuration: 60,
        dependencies: '[8]'
    }
];
// 为任务生成步骤
async function generateStepsForTask(taskId, flowType) {
    let steps = [];
    switch (flowType) {
        case 'non_core_deployment':
            steps = NON_CORE_DEPLOYMENT_STEPS;
            break;
        default:
            steps = NON_CORE_DEPLOYMENT_STEPS;
    }
    // 插入步骤到数据库
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await connection_1.Database.run(`INSERT INTO task_steps (task_id, step_order, step_name, step_type, status, estimated_duration, dependencies) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [taskId, i + 1, step.stepName, step.stepType, 'pending', step.estimatedDuration, step.dependencies]);
    }
}
//# sourceMappingURL=flowGenerator.js.map