import sqlite3 from 'sqlite3';
export declare const db: sqlite3.Database;
export declare class Database {
    static all(sql: string, params?: any[]): Promise<any[]>;
    static get(sql: string, params?: any[]): Promise<any>;
    static run(sql: string, params?: any[]): Promise<sqlite3.RunResult>;
    static transaction(operations: (() => Promise<any>)[]): Promise<any[]>;
}
export default Database;
//# sourceMappingURL=connection.d.ts.map