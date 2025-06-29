import fs from 'fs';
import path from 'path';
import { Database } from '../database/connection';

interface CSVService {
  name: string;
  status: string;
  type: string;
  region: string;
  coreLevel: string;
  idc: string;
  groupName: string;
  servicePath: string;
  managementUrl: string;
}

// 解析CSV文件
function parseCSV(filePath: string): CSVService[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',');
  
  const services: CSVService[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length >= headers.length) {
      services.push({
        name: values[0]?.replace(/"/g, '').trim() || '',
        status: values[1]?.replace(/"/g, '').trim() || '',
        type: values[2]?.replace(/"/g, '').trim() || '',
        region: values[3]?.replace(/"/g, '').trim() || '',
        coreLevel: values[4]?.replace(/"/g, '').trim() || '',
        idc: values[5]?.replace(/"/g, '').trim() || '',
        groupName: values[6]?.replace(/"/g, '').trim() || '',
        servicePath: values[7]?.replace(/"/g, '').trim() || '',
        managementUrl: values[8]?.replace(/"/g, '').trim() || '',
      });
    }
  }
  
  return services;
}

// 导入服务数据
export async function importServices() {
  try {
    console.log('开始导入服务配置数据...');
    
    // 先创建消息模板表（如果不存在）
    const createMessageTemplatesTable = `
      CREATE TABLE IF NOT EXISTS message_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        template TEXT NOT NULL,
        variables TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await Database.run(createMessageTemplatesTable);
    console.log('消息模板表创建完成');
    
    const csvPath = path.join(__dirname, '../../../上线流程检查清单.csv');
    const services = parseCSV(csvPath);
    
    console.log(`解析到 ${services.length} 条服务配置`);
    
    // 清空现有服务数据
    await Database.run('DELETE FROM services');
    
    // 插入新数据
    for (const service of services) {
      const sql = `
        INSERT INTO services (
          name, display_name, type, region, core_level, idc, group_name, 
          service_path, management_url, is_active, created_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await Database.run(sql, [
        service.name,
        service.name, // display_name 使用相同的名称
        service.type,
        service.region,
        service.coreLevel,
        service.idc,
        service.groupName === '不适用' ? null : service.groupName,
        service.servicePath,
        service.managementUrl,
        1, // is_active
        new Date().toISOString()
      ]);
    }
    
    // 插入一些基础配置
    const configs = [
      { key: 'deployment_notification_group', value: '@所有人', description: '部署通知群组' },
      { key: 'max_deployment_time', value: '120', description: '最大部署时间(分钟)' },
      { key: 'auto_rollback_enabled', value: 'false', description: '是否启用自动回滚' },
      { key: 'deployment_env', value: 'production', description: '部署环境' },
      { key: 'health_check_timeout', value: '300', description: '健康检查超时时间(秒)' }
    ];
    
    // 清空现有配置
    await Database.run('DELETE FROM configs');
    
    for (const config of configs) {
      await Database.run(
        'INSERT INTO configs (config_key, config_value, description, updated_time) VALUES (?, ?, ?, ?)',
        [config.key, config.value, config.description, new Date().toISOString()]
      );
    }
    
    // 插入消息模板
    const templates = [
      {
        name: 'DS部署开始通知',
        type: 'deployment_start',
        template: '🚀 开始部署 ${serviceName}\n时间: ${startTime}\n环境: ${environment}\n操作人: ${operator}',
        variables: ['serviceName', 'startTime', 'environment', 'operator'],
        isActive: 1
      },
      {
        name: 'DS部署完成通知',
        type: 'deployment_complete',
        template: '✅ ${serviceName} 部署完成\n开始时间: ${startTime}\n完成时间: ${endTime}\n耗时: ${duration}分钟',
        variables: ['serviceName', 'startTime', 'endTime', 'duration'],
        isActive: 1
      },
      {
        name: '流量切换通知',
        type: 'traffic_switch',
        template: '🔄 ${serviceName} 流量切换\n从: ${fromGroup} → 到: ${toGroup}\n切换时间: ${switchTime}',
        variables: ['serviceName', 'fromGroup', 'toGroup', 'switchTime'],
        isActive: 1
      },
      {
        name: '上线完成通知',
        type: 'deployment_finished',
        template: '🎉 上线完成！\n任务: ${taskName}\n总耗时: ${totalDuration}分钟\n完成步骤: ${completedSteps}/${totalSteps}',
        variables: ['taskName', 'totalDuration', 'completedSteps', 'totalSteps'],
        isActive: 1
      }
    ];
    
    // 清空现有模板
    await Database.run('DELETE FROM message_templates');
    
    for (const template of templates) {
      await Database.run(
        `INSERT INTO message_templates (name, type, template, variables, is_active, created_time) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          template.name,
          template.type,
          template.template,
          JSON.stringify(template.variables),
          template.isActive,
          new Date().toISOString()
        ]
      );
    }
    
    console.log('✅ 服务配置数据导入完成！');
    console.log(`- ${services.length} 个服务配置`);
    console.log(`- ${configs.length} 个系统配置`);
    console.log(`- ${templates.length} 个消息模板`);
    
  } catch (error) {
    console.error('❌ 导入失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  importServices()
    .then(() => {
      console.log('导入完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('导入失败:', error);
      process.exit(1);
    });
} 