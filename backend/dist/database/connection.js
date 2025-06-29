"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = exports.db = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const DB_PATH = path_1.default.join(__dirname, '../../database/deployment-flow.db');
// 创建数据库连接
exports.db = new sqlite3_1.default.Database(DB_PATH, (err) => {
    if (err) {
        console.error('数据库连接失败:', err.message);
    }
    else {
        console.log('数据库连接成功');
        // 启用外键约束
        exports.db.run('PRAGMA foreign_keys = ON');
    }
});
// 封装数据库操作方法
class Database {
    // 执行查询，返回所有结果
    static all(sql, params = []) {
        return new Promise((resolve, reject) => {
            exports.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
    // 执行查询，返回单个结果
    static get(sql, params = []) {
        return new Promise((resolve, reject) => {
            exports.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(row);
                }
            });
        });
    }
    // 执行插入、更新、删除操作
    static run(sql, params = []) {
        return new Promise((resolve, reject) => {
            exports.db.run(sql, params, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this);
                }
            });
        });
    }
    // 执行事务
    static async transaction(operations) {
        return new Promise((resolve, reject) => {
            exports.db.serialize(async () => {
                exports.db.run('BEGIN TRANSACTION');
                try {
                    const results = [];
                    for (const operation of operations) {
                        const result = await operation();
                        results.push(result);
                    }
                    exports.db.run('COMMIT', (err) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve(results);
                        }
                    });
                }
                catch (error) {
                    exports.db.run('ROLLBACK');
                    reject(error);
                }
            });
        });
    }
}
exports.Database = Database;
exports.default = Database;
//# sourceMappingURL=connection.js.map