import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDatabase } from './scripts/initDatabase';

// 导入路由
import taskRoutes from './routes/taskRoutes';
import stepRoutes from './routes/stepRoutes';
import serviceRoutes from './routes/serviceRoutes';
import configRoutes from './routes/configRoutes';
import historyRoutes from './routes/historyRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// API路由
app.use('/api/tasks', taskRoutes);
app.use('/api/steps', stepRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/configs', configRoutes);
app.use('/api/templates', configRoutes);
app.use('/api/history', historyRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA路由处理
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer(); 