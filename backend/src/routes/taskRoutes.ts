import { Router } from 'express';
import { Database } from '../database/connection';
import { generateStepsForTask } from '../utils/flowGenerator';

const router = Router();

// 获取所有任务
router.get('/', async (req, res) => {
  try {
    const tasks = await Database.all('SELECT * FROM tasks ORDER BY created_time DESC');
    res.json({ success: true, data: tasks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取当前任务
router.get('/current', async (req, res) => {
  try {
    const task = await Database.get(
      'SELECT * FROM tasks WHERE status = ? ORDER BY created_time DESC LIMIT 1',
      ['in_progress']
    );
    res.json({ success: true, data: task || null });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取单个任务
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Database.get('SELECT * FROM tasks WHERE id = ?', [id]);
    
    if (!task) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }
    
    res.json({ success: true, data: task });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建新任务
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const result = await Database.run(
      'INSERT INTO tasks (name, description, status) VALUES (?, ?, ?)',
      [name, description || '', 'draft']
    );
    
    const taskId = result.lastID;
    
    // 生成默认步骤
    await generateStepsForTask(taskId, 'non_core_deployment');
    
    const task = await Database.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    res.json({ success: true, data: task });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新任务
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, startTime, endTime } = req.body;
    
    await Database.run(
      `UPDATE tasks SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        updated_time = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, description, status, startTime, endTime, id]
    );
    
    const task = await Database.get('SELECT * FROM tasks WHERE id = ?', [id]);
    res.json({ success: true, data: task });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除任务
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Database.run('DELETE FROM tasks WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取任务的步骤
router.get('/:id/steps', async (req, res) => {
  try {
    const { id } = req.params;
    const steps = await Database.all(
      'SELECT * FROM task_steps WHERE task_id = ? ORDER BY step_order',
      [id]
    );
    res.json({ success: true, data: steps });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取任务的待办事项
router.get('/:id/todos', async (req, res) => {
  try {
    const { id } = req.params;
    const steps = await Database.all(
      'SELECT * FROM task_steps WHERE task_id = ? ORDER BY step_order',
      [id]
    );
    
    // 生成待办事项
    const todos = [];
    const nextStep = steps.find(s => s.status === 'pending');
    if (nextStep) {
      todos.push({
        id: `step-${nextStep.id}`,
        title: nextStep.step_name,
        description: `执行${nextStep.step_name}`,
        priority: 'high',
        estimatedTime: nextStep.estimated_duration || 0,
        action: 'operate',
        stepId: nextStep.id,
        taskId: id,
      });
    }
    
    res.json({ success: true, data: todos });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router; 