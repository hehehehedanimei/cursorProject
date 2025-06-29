"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const initDatabase_1 = require("./scripts/initDatabase");
// 导入路由
const taskRoutes_1 = __importDefault(require("./routes/taskRoutes"));
const stepRoutes_1 = __importDefault(require("./routes/stepRoutes"));
const serviceRoutes_1 = __importDefault(require("./routes/serviceRoutes"));
const configRoutes_1 = __importDefault(require("./routes/configRoutes"));
const historyRoutes_1 = __importDefault(require("./routes/historyRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// 中间件
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// 静态文件服务
app.use(express_1.default.static(path_1.default.join(__dirname, '../../frontend/dist')));
// API路由
app.use('/api/tasks', taskRoutes_1.default);
app.use('/api/steps', stepRoutes_1.default);
app.use('/api/services', serviceRoutes_1.default);
app.use('/api/configs', configRoutes_1.default);
app.use('/api/templates', configRoutes_1.default);
app.use('/api/history', historyRoutes_1.default);
// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// SPA路由处理
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../frontend/dist/index.html'));
});
// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
// 启动服务器
async function startServer() {
    try {
        // 初始化数据库
        await (0, initDatabase_1.initDatabase)();
        app.listen(PORT, () => {
            console.log(`服务器运行在 http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error('服务器启动失败:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=index.js.map