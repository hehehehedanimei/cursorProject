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
// 流程编号区间定义（避免冲突，支持独立并行）
const FLOW_ORDER_RANGES = {
    'domestic_non_core': 1, // 1-99
    'international_non_core': 100, // 100-199  
    'international_crawler': 200 // 200-299
};
// 为任务生成步骤（支持独立并行的多种流程类型）
async function generateStepsForTask(taskId, flowTypes) {
    const flowTypeArray = Array.isArray(flowTypes) ? flowTypes : [flowTypes];
    // 为每个流程类型生成独立的步骤
    for (const flowType of flowTypeArray) {
        const steps = FLOW_TYPES[flowType] || DOMESTIC_NON_CORE_STEPS;
        const baseOrder = FLOW_ORDER_RANGES[flowType] || 1;
        // 每个流程使用独立的编号区间，依赖关系调整到对应区间
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            // 调整依赖关系到当前流程的编号区间
            let adjustedDependencies = '[]';
            try {
                const originalDeps = JSON.parse(step.dependencies);
                if (originalDeps.length > 0) {
                    const newDeps = originalDeps.map((dep) => dep + baseOrder - 1);
                    adjustedDependencies = JSON.stringify(newDeps);
                }
            }
            catch (e) {
                adjustedDependencies = '[]';
            }
            await connection_1.Database.run(`INSERT INTO task_steps (task_id, step_order, step_name, step_type, status, estimated_duration, dependencies, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                taskId,
                baseOrder + i, // 使用流程特定的编号区间
                step.stepName,
                step.stepType,
                'pending',
                step.estimatedDuration,
                adjustedDependencies, // 调整后的依赖关系
                step.category // 用于标识流程类型
            ]);
        }
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