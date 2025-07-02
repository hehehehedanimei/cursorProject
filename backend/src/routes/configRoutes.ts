import { Router } from 'express';
import { Database } from '../database/connection';

const router = Router();

// 获取配置
router.get('/', async (req, res) => {
  try {
    const configs = await Database.all('SELECT * FROM configs');
    res.json({ success: true, data: configs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取流程模板配置
router.get('/flow-templates', async (req, res) => {
  try {
    const { flowType } = req.query;
    
    let sql = 'SELECT * FROM flow_templates';
    let params: any[] = [];
    
    if (flowType) {
      sql += ' WHERE flow_type = ?';
      params.push(flowType);
    }
    
    sql += ' ORDER BY flow_type, step_order';
    
    const templates = await Database.all(sql, params);
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error: any) {
    console.error('获取流程模板失败:', error);
    res.status(500).json({
      success: false,
      message: '获取流程模板失败',
      error: error.message
    });
  }
});

// 更新流程模板配置
router.put('/flow-templates/:flowType', async (req, res) => {
  try {
    const { flowType } = req.params;
    const { templates } = req.body;
    
    console.log('收到的templates数据:', JSON.stringify(templates, null, 2));
    
    if (!Array.isArray(templates)) {
      return res.status(400).json({
        success: false,
        message: '模板数据格式错误'
      });
    }
    
    // 删除旧的模板配置
    await Database.run('DELETE FROM flow_templates WHERE flow_type = ?', [flowType]);
    
    // 插入新的模板配置
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      const linksValue = template.links || '[]';
      
      console.log(`步骤 ${i+1} - ${template.stepName}:`);
      console.log('  原始links:', template.links);
      console.log('  处理后links:', linksValue);
      console.log('  links类型:', typeof linksValue);
      
      await Database.run(
        `INSERT INTO flow_templates (
          flow_type, step_name, step_type, estimated_duration, 
          step_order, dependencies, category, links
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          flowType,
          template.stepName,
          template.stepType,
          template.estimatedDuration || 5,
          i + 1,
          JSON.stringify(template.dependencies || []),
          flowType,
          linksValue
        ]
      );
    }
    
    res.json({
      success: true,
      message: '流程模板更新成功'
    });
  } catch (error: any) {
    console.error('更新流程模板失败:', error);
    res.status(500).json({
      success: false,
      message: '更新流程模板失败',
      error: error.message
    });
  }
});

// 重置流程模板为默认配置
router.post('/flow-templates/:flowType/reset', async (req, res) => {
  try {
    const { flowType } = req.params;
    
    // 这里调用初始化默认模板的函数
    await initDefaultFlowTemplates(flowType);
    
    res.json({
      success: true,
      message: '流程模板已重置为默认配置'
    });
  } catch (error: any) {
    console.error('重置流程模板失败:', error);
    res.status(500).json({
      success: false,
      message: '重置流程模板失败',
      error: error.message
    });
  }
});

// 初始化默认流程模板
async function initDefaultFlowTemplates(flowType?: string) {
  const defaultTemplates = {
    'domestic_non_core': [
      { stepName: '关闭自动加载开关', stepType: 'config', estimatedDuration: 5, dependencies: [] },
      { stepName: '流量切至IDC2', stepType: 'switch', estimatedDuration: 10, dependencies: [1] },
      { stepName: '部署国内非核心 IDC1 DS B组', stepType: 'deploy', estimatedDuration: 30, dependencies: [2] },
      { stepName: '部署国内非核心 IDC1 Service', stepType: 'deploy', estimatedDuration: 20, dependencies: [3] },
      { stepName: '国内非核心 DS IDC1 切到B组，预热GS', stepType: 'switch', estimatedDuration: 10, dependencies: [4] },
      { stepName: '服务预热验证', stepType: 'verify', estimatedDuration: 15, dependencies: [5] },
      { stepName: '流量切至IDC1 2%', stepType: 'switch', estimatedDuration: 5, dependencies: [6] },
      { stepName: '流量切至IDC1 5%', stepType: 'switch', estimatedDuration: 5, dependencies: [7] },
      { stepName: '流量切至IDC1 10%', stepType: 'switch', estimatedDuration: 5, dependencies: [8] },
      { stepName: '流量切至IDC1 20%', stepType: 'switch', estimatedDuration: 5, dependencies: [9] },
      { stepName: '流量切至IDC1 50%', stepType: 'switch', estimatedDuration: 5, dependencies: [10] },
      { stepName: '流量切至IDC1 80%', stepType: 'switch', estimatedDuration: 5, dependencies: [11] },
      { stepName: '流量切至IDC1 100%', stepType: 'switch', estimatedDuration: 5, dependencies: [12] },
      { stepName: '部署国内非核心 IDC1 DS A组', stepType: 'deploy', estimatedDuration: 25, dependencies: [13] },
      { stepName: '国内非核心 IDC1 切至A组', stepType: 'switch', estimatedDuration: 5, dependencies: [14] },
      { stepName: '打开自动加载开关', stepType: 'config', estimatedDuration: 3, dependencies: [15] }
    ],
    'international_non_core': [
      { stepName: '关闭国际自动加载开关', stepType: 'config', estimatedDuration: 5, dependencies: [] },
      { stepName: '检查国际版本数据', stepType: 'verify', estimatedDuration: 10, dependencies: [1] },
      { stepName: '切国际流量至IDC2', stepType: 'switch', estimatedDuration: 5, dependencies: [2] },
      { stepName: '部署国际非核心 IDC1 DS A组', stepType: 'deploy', estimatedDuration: 30, dependencies: [3] },
      { stepName: '切国际DS服务至A组', stepType: 'switch', estimatedDuration: 5, dependencies: [4] },
      { stepName: '部署国际非核心 IDC1 DS B组', stepType: 'deploy', estimatedDuration: 25, dependencies: [5] },
      { stepName: '部署国际非核心 IDC1 Service', stepType: 'deploy', estimatedDuration: 20, dependencies: [6] },
      { stepName: '国际服务预热验证', stepType: 'verify', estimatedDuration: 15, dependencies: [7] },
      { stepName: '逐步切国际流量至IDC1', stepType: 'switch', estimatedDuration: 60, dependencies: [8] }
    ],
    'international_crawler': [
      { stepName: '关闭爬虫调度', stepType: 'config', estimatedDuration: 3, dependencies: [] },
      { stepName: '检查爬虫数据一致性', stepType: 'verify', estimatedDuration: 8, dependencies: [1] },
      { stepName: '停止爬虫服务', stepType: 'switch', estimatedDuration: 3, dependencies: [2] },
      { stepName: '部署国际爬虫 IDC1', stepType: 'deploy', estimatedDuration: 20, dependencies: [3] },
      { stepName: '启动爬虫服务', stepType: 'switch', estimatedDuration: 3, dependencies: [4] },
      { stepName: '爬虫功能验证', stepType: 'verify', estimatedDuration: 10, dependencies: [5] },
      { stepName: '恢复爬虫调度', stepType: 'switch', estimatedDuration: 3, dependencies: [6] }
    ]
  };
  
  const types = flowType ? [flowType] : Object.keys(defaultTemplates);
  
  for (const type of types) {
    const templates = defaultTemplates[type as keyof typeof defaultTemplates];
    if (!templates) continue;
    
    // 删除旧配置
    await Database.run('DELETE FROM flow_templates WHERE flow_type = ?', [type]);
    
    // 插入默认配置
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      await Database.run(
        `INSERT INTO flow_templates (
          flow_type, step_name, step_type, estimated_duration, 
          step_order, dependencies, category, links
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          type,
          template.stepName,
          template.stepType,
          template.estimatedDuration,
          i + 1,
          JSON.stringify(template.dependencies),
          type,
          '[]' // 默认空链接
        ]
      );
    }
  }
}

export default router; 