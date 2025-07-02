import { Database } from '../database/connection';
import { addSampleLinks } from './addSampleLinks';

// 为现有数据库添加links字段的迁移脚本
export async function addLinksColumn() {
  try {
    console.log('开始添加links字段到task_steps表...');
    
    // 检查字段是否已存在
    const tableInfo = await Database.all("PRAGMA table_info(task_steps)");
    const hasLinksColumn = tableInfo.some((column: any) => column.name === 'links');
    
    if (hasLinksColumn) {
      console.log('links字段已存在，跳过迁移');
      return;
    }
    
    // 添加links字段
    await Database.run('ALTER TABLE task_steps ADD COLUMN links TEXT');
    
    console.log('成功添加links字段到task_steps表');
    
    // 为现有步骤添加示例链接
    await addSampleLinks();
    
  } catch (error) {
    console.error('添加links字段失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  addLinksColumn()
    .then(() => {
      console.log('迁移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('迁移失败:', error);
      process.exit(1);
    });
} 