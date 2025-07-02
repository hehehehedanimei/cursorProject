import { Database } from '../database/connection';

// 临时定义类型（后端没有统一的types文件）
interface TaskStep {
  id: number;
  taskId: number;
  stepOrder: number;
  stepName: string;
  stepType: string;
  status: string;
  estimatedDuration?: number;
  dependencies?: string;
  serviceConfig?: string;
  links?: string;
  createdTime: string;
}

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
  'domestic_non_core': 1,        // 1-99
  'international_non_core': 100, // 100-199  
  'international_crawler': 200   // 200-299
};

// 为任务生成步骤
export async function generateStepsForTask(taskId: number, flowTypes: string | string[]): Promise<TaskStep[]> {
  try {
    const flowTypeArray = Array.isArray(flowTypes) ? flowTypes : [flowTypes];
    const allSteps: TaskStep[] = [];
    
    for (const flowType of flowTypeArray) {
      console.log(`为任务 ${taskId} 生成 ${flowType} 流程步骤`);
      
      // 获取流程模板
      const templates = await Database.all(
        'SELECT * FROM flow_templates WHERE flow_type = ? ORDER BY step_order',
        [flowType]
      );
      
      if (templates.length === 0) {
        console.warn(`未找到 ${flowType} 的流程模板`);
        continue;
      }

      // 创建步骤
      for (const template of templates) {
        // 使用模板中的链接数据，如果为空则使用默认链接
        let links: { name: string; url: string }[] = [];
        
        if (template.links && template.links !== '[]') {
          try {
            links = JSON.parse(template.links);
          } catch (e) {
            console.warn(`解析模板链接失败: ${e}`);
            links = [];
          }
        }
        
        // 如果模板中没有链接，则根据步骤类型添加默认链接
        if (links.length === 0) {
          if (template.step_type === 'verify') {
            links = [
              { name: '监控系统', url: 'https://monitor.example.com/dashboard' },
              { name: '日志查看', url: 'https://logs.example.com/search' }
            ];
          } else if (template.step_type === 'deploy') {
            links = [
              { name: '部署控制台', url: 'https://deploy.example.com/console' },
              { name: '服务状态', url: 'https://status.example.com/health' }
            ];
          } else if (template.step_type === 'switch') {
            links = [
              { name: '流量控制台', url: 'https://traffic.example.com/control' },
              { name: '负载均衡器', url: 'https://lb.example.com/balance' }
            ];
          } else if (template.step_type === 'config') {
            links = [
              { name: '配置中心', url: 'https://config.example.com/settings' },
              { name: '管理后台', url: 'https://admin.example.com/config' }
            ];
          }
        }
        
        const result = await Database.run(
          `INSERT INTO task_steps (
            task_id, step_order, step_name, step_type, status,
            estimated_duration, dependencies, service_config, links, notes, created_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            taskId,
            template.step_order,
            template.step_name,
            template.step_type,
            'pending',
            template.estimated_duration,
            template.dependencies,
            '{}',
            JSON.stringify(links),
            flowType  // 添加流程类型到notes字段
          ]
        );

        const step: TaskStep = {
          id: result.lastID!,
          taskId: taskId,
          stepOrder: template.step_order,
          stepName: template.step_name,
          stepType: template.step_type,
          status: 'pending',
          estimatedDuration: template.estimated_duration,
          dependencies: template.dependencies,
          serviceConfig: '{}',
          links: JSON.stringify(links),
          createdTime: new Date().toISOString()
        };

        allSteps.push(step);
      }
    }

    console.log(`✅ 为任务 ${taskId} 生成了 ${allSteps.length} 个步骤`);
    return allSteps;

  } catch (error) {
    console.error('生成任务步骤失败:', error);
    throw error;
  }
}

// 为特定流程类型初始化默认模板
async function initDefaultTemplatesForType(flowType: string): Promise<void> {
  const defaultTemplates: { [key: string]: any[] } = {
    'domestic_non_core': DOMESTIC_NON_CORE_STEPS,
    'international_non_core': INTERNATIONAL_NON_CORE_STEPS,
    'international_crawler': INTERNATIONAL_CRAWLER_STEPS
  };
  
  const templates = defaultTemplates[flowType];
  if (!templates) return;
  
  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];
    await Database.run(
      `INSERT INTO flow_templates (
        flow_type, step_name, step_type, estimated_duration, 
        step_order, dependencies, category
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        flowType,
        template.stepName,
        template.stepType,
        template.estimatedDuration,
        i + 1,
        template.dependencies,
        flowType
      ]
    );
  }
}

// 获取支持的流程类型
export function getSupportedFlowTypes(): { value: string; label: string; }[] {
  return [
    { value: 'domestic_non_core', label: '国内非核心' },
    { value: 'international_non_core', label: '国际非核心' },
    { value: 'international_crawler', label: '国际爬虫' }
  ];
} 