"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const connection_1 = require("../database/connection");
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
  )`
];
// 初始化数据库
async function initDatabase() {
    try {
        console.log('开始初始化数据库...');
        // 确保数据库目录存在
        const dbDir = path_1.default.join(__dirname, '../../database');
        if (!fs_1.default.existsSync(dbDir)) {
            fs_1.default.mkdirSync(dbDir, { recursive: true });
        }
        // 创建表
        for (const sql of createTables) {
            await connection_1.Database.run(sql);
        }
        console.log('数据库初始化完成！');
    }
    catch (error) {
        console.error('数据库初始化失败:', error);
        throw error;
    }
}
//# sourceMappingURL=initDatabase.js.map