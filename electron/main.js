const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

let mainWindow;
let backendProcess;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: '上线流程管理工具',
    show: false // 先不显示窗口，等后端就绪后再显示
  });

  // 设置应用菜单
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建任务',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-task');
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '查看',
      submenu: [
        {
          label: '刷新',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.reload();
          }
        },
        {
          label: '切换开发者工具',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            mainWindow.toggleDevTools();
          }
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于',
              message: '上线流程管理工具',
              detail: '版本: 1.0.0\n一个用于管理上线流程的桌面应用'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // 启动后端服务并等待就绪
  startBackendServerAndWait();

  // 当窗口关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (backendProcess) {
      backendProcess.kill();
    }
  });
}

function startBackendServerAndWait() {
  console.log('正在启动后端服务...');
  
  // 确定后端文件路径
  const isDev = !app.isPackaged;
  let backendPath;
  
  if (isDev) {
    // 开发环境
    backendPath = path.join(__dirname, '../backend/dist/index.js');
  } else {
    // 生产环境 - 使用extraResources路径
    backendPath = path.join(process.resourcesPath, 'backend/dist/index.js');
  }
  
  console.log('后端文件路径:', backendPath);
  console.log('是否为开发环境:', isDev);
  console.log('文件是否存在:', fs.existsSync(backendPath));
  
  // 如果文件不存在，尝试其他路径
  if (!fs.existsSync(backendPath)) {
    console.log('尝试备用路径...');
    const alternativePaths = [
      path.join(__dirname, '../backend/dist/index.js'),
      path.join(process.resourcesPath, '../backend/dist/index.js'),
      path.join(app.getAppPath(), 'backend/dist/index.js')
    ];
    
    for (const altPath of alternativePaths) {
      console.log('尝试路径:', altPath);
      if (fs.existsSync(altPath)) {
        backendPath = altPath;
        console.log('找到后端文件:', backendPath);
        break;
      }
    }
  }
  
  if (!fs.existsSync(backendPath)) {
    const errorMsg = `找不到后端文件: ${backendPath}`;
    console.error(errorMsg);
    dialog.showErrorBox('文件错误', errorMsg);
    return;
  }
  
  // 启动后端服务
  backendProcess = spawn('node', [backendPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production' }
  });

  // 监听后端输出
  backendProcess.stdout.on('data', (data) => {
    console.log('后端输出:', data.toString());
  });

  backendProcess.stderr.on('data', (data) => {
    console.error('后端错误:', data.toString());
  });

  backendProcess.on('error', (err) => {
    console.error('后端进程启动失败:', err);
    const errorMsg = `后端服务启动失败: ${err.message}`;
    dialog.showErrorBox('启动错误', errorMsg);
  });

  backendProcess.on('exit', (code) => {
    console.log(`后端进程退出，代码: ${code}`);
    if (code !== 0 && code !== null) {
      const errorMsg = `后端服务异常退出，代码: ${code}`;
      console.error(errorMsg);
    }
  });

  // 等待后端服务就绪
  waitForBackendReady();
}

function waitForBackendReady(retries = 30) {
  console.log(`检查后端服务状态... (剩余重试次数: ${retries})`);
  
  if (retries <= 0) {
    console.error('后端服务启动超时');
    const errorMsg = '后端服务启动超时，请检查系统配置或重新启动应用';
    dialog.showErrorBox('启动超时', errorMsg);
    return;
  }

  // 检查后端健康状态
  const req = http.get('http://localhost:3000/api/health', (res) => {
    console.log('后端服务响应，状态码:', res.statusCode);
    if (res.statusCode === 200) {
      console.log('后端服务就绪，加载前端界面...');
      mainWindow.loadURL('http://localhost:3000').then(() => {
        console.log('前端界面加载成功');
        mainWindow.show(); // 显示窗口
      }).catch((err) => {
        console.error('前端界面加载失败:', err);
        dialog.showErrorBox('界面加载错误', `前端界面加载失败: ${err.message}`);
      });
    } else {
      // 状态码不对，继续重试
      setTimeout(() => waitForBackendReady(retries - 1), 1000);
    }
  });

  req.on('error', (err) => {
    console.log('后端服务尚未就绪，继续等待...', err.code);
    setTimeout(() => waitForBackendReady(retries - 1), 1000);
  });

  req.setTimeout(5000, () => {
    req.destroy();
    setTimeout(() => waitForBackendReady(retries - 1), 1000);
  });
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  console.log('Electron应用就绪');
  createWindow();
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  console.log('所有窗口已关闭');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  console.log('应用被激活');
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 在应用退出前清理后端进程
app.on('before-quit', () => {
  console.log('应用即将退出，正在清理后端进程...');
  if (backendProcess) {
    console.log('正在关闭后端服务...');
    backendProcess.kill('SIGTERM');
    
    // 如果优雅关闭失败，强制杀死进程
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        console.log('强制关闭后端进程');
        backendProcess.kill('SIGKILL');
      }
    }, 3000);
  }
}); 