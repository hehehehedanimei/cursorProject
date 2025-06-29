"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStepsForTask = generateStepsForTask;
exports.getSupportedFlowTypes = getSupportedFlowTypes;
const connection_1 = require("../database/connection");
// 国内非核心组上线流程步骤定义
const DOMESTIC_NON_CORE_STEPS = [
    {
        stepName: '关闭自动加载开关',
        stepType: 'config',
        estimatedDuration: 5,
        dependencies: '[]',
        category: 'domestic_non_core'
    },
    {
        stepName: '检查目标版本数据',
        stepType: 'verify',
        estimatedDuration: 10,
        dependencies: '[1]',
        category: 'domestic_non_core'
    },
    {
        stepName: '切流量至IDC2',
        stepType: 'switch',
        estimatedDuration: 5,
        dependencies: '[2]',
        category: 'domestic_non_core'
    },
    {
        stepName: '部署国内非核心 IDC1 DS A组',
        stepType: 'deploy',
        estimatedDuration: 30,
        dependencies: '[3]',
        category: 'domestic_non_core'
    },
    {
        stepName: '切DS服务至A组',
        stepType: 'switch',
        estimatedDuration: 5,
        dependencies: '[4]',
        category: 'domestic_non_core'
    },
    {
        stepName: '部署国内非核心 IDC1 DS B组',
        stepType: 'deploy',
        estimatedDuration: 25,
        dependencies: '[5]',
        category: 'domestic_non_core'
    },
    {
        stepName: '部署国内非核心 IDC1 Service',
        stepType: 'deploy',
        estimatedDuration: 20,
        dependencies: '[6]',
        category: 'domestic_non_core'
    },
    {
        stepName: '服务预热验证',
        stepType: 'verify',
        estimatedDuration: 15,
        dependencies: '[7]',
        category: 'domestic_non_core'
    },
    {
        stepName: '逐步切流量至IDC1',
        stepType: 'switch',
        estimatedDuration: 60,
        dependencies: '[8]',
        category: 'domestic_non_core'
    }
];
// 国际非核心组上线流程步骤定义
const INTERNATIONAL_NON_CORE_STEPS = [
    {
        stepName: '关闭国际自动加载开关',
        stepType: 'config',
        estimatedDuration: 5,
        dependencies: '[]',
        category: 'international_non_core'
    },
    {
        stepName: '检查国际版本数据',
        stepType: 'verify',
        estimatedDuration: 10,
        dependencies: '[1]',
        category: 'international_non_core'
    },
    {
        stepName: '切国际流量至IDC2',
        stepType: 'switch',
        estimatedDuration: 5,
        dependencies: '[2]',
        category: 'international_non_core'
    },
    {
        stepName: '部署国际非核心 IDC1 DS A组',
        stepType: 'deploy',
        estimatedDuration: 30,
        dependencies: '[3]',
        category: 'international_non_core'
    },
    {
        stepName: '切国际DS服务至A组',
        stepType: 'switch',
        estimatedDuration: 5,
        dependencies: '[4]',
        category: 'international_non_core'
    },
    {
        stepName: '部署国际非核心 IDC1 DS B组',
        stepType: 'deploy',
        estimatedDuration: 25,
        dependencies: '[5]',
        category: 'international_non_core'
    },
    {
        stepName: '部署国际非核心 IDC1 Service',
        stepType: 'deploy',
        estimatedDuration: 20,
        dependencies: '[6]',
        category: 'international_non_core'
    },
    {
        stepName: '国际服务预热验证',
        stepType: 'verify',
        estimatedDuration: 15,
        dependencies: '[7]',
        category: 'international_non_core'
    },
    {
        stepName: '逐步切国际流量至IDC1',
        stepType: 'switch',
        estimatedDuration: 60,
        dependencies: '[8]',
        category: 'international_non_core'
    }
];
// 国际爬虫流程步骤定义
const INTERNATIONAL_CRAWLER_STEPS = [
    {
        stepName: '关闭爬虫调度',
        stepType: 'config',
        estimatedDuration: 3,
        dependencies: '[]',
        category: 'international_crawler'
    },
    {
        stepName: '检查爬虫数据一致性',
        stepType: 'verify',
        estimatedDuration: 8,
        dependencies: '[1]',
        category: 'international_crawler'
    },
    {
        stepName: '停止爬虫服务',
        stepType: 'switch',
        estimatedDuration: 3,
        dependencies: '[2]',
        category: 'international_crawler'
    },
    {
        stepName: '部署国际爬虫 IDC1',
        stepType: 'deploy',
        estimatedDuration: 20,
        dependencies: '[3]',
        category: 'international_crawler'
    },
    {
        stepName: '启动爬虫服务',
        stepType: 'switch',
        estimatedDuration: 3,
        dependencies: '[4]',
        category: 'international_crawler'
    },
    {
        stepName: '爬虫功能验证',
        stepType: 'verify',
        estimatedDuration: 10,
        dependencies: '[5]',
        category: 'international_crawler'
    },
    {
        stepName: '恢复爬虫调度',
        stepType: 'switch',
        estimatedDuration: 3,
        dependencies: '[6]',
        category: 'international_crawler'
    }
];
// 流程类型映射
const FLOW_TYPES = {
    'domestic_non_core': DOMESTIC_NON_CORE_STEPS,
    'international_non_core': INTERNATIONAL_NON_CORE_STEPS,
    'international_crawler': INTERNATIONAL_CRAWLER_STEPS,
    'non_core_deployment': DOMESTIC_NON_CORE_STEPS // 向后兼容
};
// 为任务生成步骤（支持多种流程类型）
async function generateStepsForTask(taskId, flowTypes) {
    const flowTypeArray = Array.isArray(flowTypes) ? flowTypes : [flowTypes];
    let allSteps = [];
    let stepOrderOffset = 0;
    // 合并多个流程的步骤
    for (const flowType of flowTypeArray) {
        const steps = FLOW_TYPES[flowType] || DOMESTIC_NON_CORE_STEPS;
        // 调整步骤顺序和依赖关系
        const adjustedSteps = steps.map((step, index) => {
            let adjustedDependencies = '[]';
            // 解析原始依赖
            try {
                const originalDeps = JSON.parse(step.dependencies);
                if (originalDeps.length > 0) {
                    // 调整依赖关系的编号
                    const newDeps = originalDeps.map((dep) => dep + stepOrderOffset);
                    adjustedDependencies = JSON.stringify(newDeps);
                }
            }
            catch (e) {
                adjustedDependencies = '[]';
            }
            return {
                ...step,
                stepOrder: index + 1 + stepOrderOffset,
                dependencies: adjustedDependencies
            };
        });
        allSteps = allSteps.concat(adjustedSteps);
        stepOrderOffset += steps.length;
    }
    // 插入步骤到数据库
    for (const step of allSteps) {
        await connection_1.Database.run(`INSERT INTO task_steps (task_id, step_order, step_name, step_type, status, estimated_duration, dependencies, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [taskId, step.stepOrder, step.stepName, step.stepType, 'pending', step.estimatedDuration, step.dependencies, step.category]);
    }
}
// 获取支持的流程类型
function getSupportedFlowTypes() {
    return [
        { value: 'domestic_non_core', label: '国内非核心' },
        { value: 'international_non_core', label: '国际非核心' },
        { value: 'international_crawler', label: '国际爬虫' }
    ];
}
//# sourceMappingURL=flowGenerator.js.map