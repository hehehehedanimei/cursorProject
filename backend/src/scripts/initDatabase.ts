import fs from 'fs';
import path from 'path';
import { Database } from '../database/connection';

// 创建数据库表的SQL语句
const createTables = [
  `CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    start_time DATETIME,
    end_time DATETIME,
    config_snapshot TEXT,
    created_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_time DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS task_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    step_order INTEGER NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    step_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    start_time DATETIME,
    end_time DATETIME,
    estimated_duration INTEGER,
    actual_duration INTEGER,
    notes TEXT,
    reminder_time DATETIME,
    dependencies TEXT,
    service_config TEXT,
    created_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    region VARCHAR(50) NOT NULL,
    core_level VARCHAR(50) NOT NULL,
    idc VARCHAR(50) NOT NULL,
    group_name VARCHAR(50),
    service_path VARCHAR(500),
    management_url VARCHAR(500),
    is_active BOOLEAN DEFAULT 1,
    created_time DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    step_id INTEGER,
    message_type VARCHAR(50) NOT NULL,
    message_content TEXT NOT NULL,
    is_sent BOOLEAN DEFAULT 0,
    created_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES task_steps(id) ON DELETE SET NULL
  )`,

  `CREATE TABLE IF NOT EXISTS configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key VARCHAR(255) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_time DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS flow_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flow_type VARCHAR(50) NOT NULL,
    step_name VARCHAR(200) NOT NULL,
    step_type VARCHAR(20) NOT NULL,
    estimated_duration INTEGER NOT NULL DEFAULT 5,
    step_order INTEGER NOT NULL,
    dependencies TEXT DEFAULT '[]',
    category VARCHAR(50) NOT NULL,
    created_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_time DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
];

// 初始化数据库
export async function initDatabase() {
  try {
    console.log('开始初始化数据库...');
    
    // 确保数据库目录存在
    const dbDir = path.join(__dirname, '../../database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

      // 创建表
  for (const sql of createTables) {
    await Database.run(sql);
  }

  // 初始化默认流程模板数据
  await initDefaultFlowTemplates();

  console.log('数据库初始化完成！');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

// 初始化默认流程模板数据
async function initDefaultFlowTemplates() {
  try {
    // 检查是否已有流程模板数据
    const existingTemplates = await Database.all('SELECT COUNT(*) as count FROM flow_templates');
    if (existingTemplates[0].count > 0) {
      console.log('流程模板数据已存在，跳过初始化');
      return;
    }

    console.log('初始化默认流程模板数据...');

    const defaultTemplates = {
      'domestic_non_core': [
        { stepName: '关闭自动加载开关', stepType: 'config', estimatedDuration: 5, dependencies: [] },
        { stepName: '检查目标版本数据', stepType: 'verify', estimatedDuration: 10, dependencies: [1] },
        { stepName: '切流量至IDC2', stepType: 'switch', estimatedDuration: 5, dependencies: [2] },
        { stepName: '部署国内非核心 IDC1 DS A组', stepType: 'deploy', estimatedDuration: 30, dependencies: [3] },
        { stepName: '切DS服务至A组', stepType: 'switch', estimatedDuration: 5, dependencies: [4] },
        { stepName: '部署国内非核心 IDC1 DS B组', stepType: 'deploy', estimatedDuration: 25, dependencies: [5] },
        { stepName: '部署国内非核心 IDC1 Service', stepType: 'deploy', estimatedDuration: 20, dependencies: [6] },
        { stepName: '服务预热验证', stepType: 'verify', estimatedDuration: 15, dependencies: [7] },
        { stepName: '逐步切流量至IDC1', stepType: 'switch', estimatedDuration: 60, dependencies: [8] }
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

    for (const [flowType, templates] of Object.entries(defaultTemplates)) {
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
            JSON.stringify(template.dependencies),
            flowType
          ]
        );
      }
    }

    console.log('默认流程模板数据初始化完成');
  } catch (error) {
    console.error('初始化流程模板数据失败:', error);
    throw error;
  }
} 