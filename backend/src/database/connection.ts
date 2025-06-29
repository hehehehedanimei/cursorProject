import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../database/deployment-flow.db');

// 创建数据库连接
export const db = new sqlite3.Database(DB_PATH, (err: Error | null) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('数据库连接成功');
    // 启用外键约束
    db.run('PRAGMA foreign_keys = ON');
  }
});

// 封装数据库操作方法
export class Database {
  // 执行查询，返回所有结果
  static all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err: Error | null, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 执行查询，返回单个结果
  static get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err: Error | null, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 执行插入、更新、删除操作
  static run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err: Error | null) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  // 执行事务
  static async transaction(operations: (() => Promise<any>)[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      db.serialize(async () => {
        db.run('BEGIN TRANSACTION');
        try {
          const results: any[] = [];
          for (const operation of operations) {
            const result = await operation();
            results.push(result);
          }
          db.run('COMMIT', (err: Error | null) => {
            if (err) {
              reject(err);
            } else {
              resolve(results);
            }
          });
        } catch (error) {
          db.run('ROLLBACK');
          reject(error);
        }
      });
    });
  }
}

export default Database; 