import { Database } from '../database/connection';

// 为现有步骤添加示例链接数据
export async function addSampleLinks() {
  try {
    console.log('开始为现有步骤添加示例链接...');
    
    // 获取所有步骤
    const steps = await Database.all('SELECT * FROM task_steps WHERE links IS NULL OR links = ""');
    
    let updateCount = 0;
    for (const step of steps) {
      let links: { name: string; url: string }[] = [];
      
      // 根据步骤类型添加不同的示例链接
      if (step.step_type === 'verify' || step.step_name.includes('验证') || step.step_name.includes('检查')) {
        links = [
          { name: '监控系统', url: 'https://monitor.example.com/dashboard' },
          { name: '日志查看', url: 'https://logs.example.com/search' }
        ];
      } else if (step.step_type === 'deploy' || step.step_name.includes('部署')) {
        links = [
          { name: '部署控制台', url: 'https://deploy.example.com/console' },
          { name: '服务状态', url: 'https://status.example.com/services' }
        ];
      } else if (step.step_type === 'switch' || step.step_name.includes('切换') || step.step_name.includes('流量')) {
        links = [
          { name: '流量控制台', url: 'https://traffic.example.com/control' },
          { name: '负载均衡器', url: 'https://lb.example.com/balance' }
        ];
      } else if (step.step_type === 'config' || step.step_name.includes('配置') || step.step_name.includes('开关')) {
        links = [
          { name: '配置中心', url: 'https://config.example.com/settings' },
          { name: '管理后台', url: 'https://admin.example.com/config' }
        ];
      } else {
        // 通用链接
        links = [
          { name: '操作手册', url: 'https://docs.example.com/operations' },
          { name: '系统状态', url: 'https://status.example.com/overview' }
        ];
      }
      
      if (links.length > 0) {
        await Database.run(
          'UPDATE task_steps SET links = ? WHERE id = ?',
          [JSON.stringify(links), step.id]
        );
        updateCount++;
      }
    }
    
    console.log(`✅ 成功为 ${updateCount} 个步骤添加了示例链接`);
    
  } catch (error) {
    console.error('添加示例链接失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  addSampleLinks()
    .then(() => {
      console.log('添加示例链接完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('添加示例链接失败:', error);
      process.exit(1);
    });
} 