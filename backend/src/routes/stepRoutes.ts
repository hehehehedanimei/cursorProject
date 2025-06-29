import { Router } from 'express';
import { Database } from '../database/connection';

const router = Router();

// 获取任务的步骤列表
router.get('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const steps = await Database.all(
      'SELECT * FROM task_steps WHERE task_id = ? ORDER BY step_order',
      [taskId]
    );
    
    res.json({ success: true, data: steps });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取所有步骤
router.get('/', async (req, res) => {
  try {
    const steps = await Database.all('SELECT * FROM task_steps ORDER BY id');
    res.json({ success: true, data: steps });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新步骤
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, startTime, endTime } = req.body;
    
    await Database.run(
      `UPDATE task_steps SET 
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time)
       WHERE id = ?`,
      [status, notes, startTime, endTime, id]
    );
    
    const step = await Database.get('SELECT * FROM task_steps WHERE id = ?', [id]);
    
    // 如果步骤完成，检查任务是否应该自动完成
    if (status === 'completed' && step) {
      const taskId = step.task_id;
      
      // 获取任务的所有步骤
      const allSteps = await Database.all(
        'SELECT * FROM task_steps WHERE task_id = ?',
        [taskId]
      );
      
      // 检查是否所有步骤都已完成
      const totalSteps = allSteps.length;
      const completedSteps = allSteps.filter(s => s.status === 'completed').length;
      
      if (totalSteps > 0 && completedSteps === totalSteps) {
        // 所有步骤都完成了，自动完成任务
        await Database.run(
          `UPDATE tasks SET 
            status = 'completed',
            end_time = CURRENT_TIMESTAMP,
            updated_time = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [taskId]
        );
        
        console.log(`任务 ${taskId} 自动完成：所有 ${totalSteps} 个步骤已完成`);
      }
    }
    
    res.json({ success: true, data: step });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 复制通知消息
router.post('/:id/copy', async (req, res) => {
  try {
    const { id } = req.params;
    const step = await Database.get('SELECT * FROM task_steps WHERE id = ?', [id]);
    
    if (!step) {
      return res.status(404).json({ success: false, message: '步骤不存在' });
    }
    
    // 简单的消息生成逻辑
    const message = `【信息同步】${step.step_name}`;
    
    res.json({ success: true, data: message });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router; 