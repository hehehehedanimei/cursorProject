import { Router } from 'express';
import { Database } from '../database/connection';
import { generateStepsForTask, getSupportedFlowTypes } from '../utils/flowGenerator';

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

// 获取流程类型列表
router.get('/flow-types', async (req, res) => {
  try {
    const flowTypes = getSupportedFlowTypes();
    res.json({ success: true, data: flowTypes });
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
    const { name, description, flowTypes } = req.body;
    
    const result = await Database.run(
      'INSERT INTO tasks (name, description, status) VALUES (?, ?, ?)',
      [name, description || '', 'draft']
    );
    
    const taskId = result.lastID;
    
    // 生成选定的流程步骤
    const selectedFlowTypes = flowTypes || ['domestic_non_core'];
    await generateStepsForTask(taskId, selectedFlowTypes);
    
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
    
    // 流程类型映射
    const flowTypeMap: { [key: string]: { label: string; icon: string } } = {
      'domestic_non_core': { label: '国内非核心', icon: '🏠' },
      'international_non_core': { label: '国际非核心', icon: '🌍' },
      'international_crawler': { label: '国际爬虫', icon: '🕷️' }
    };
    
    // 检查步骤是否可以执行（依赖检查）
    const canExecuteStep = (step: any): boolean => {
      if (step.status !== 'pending') {
        return false;
      }
      
      let dependencies = [];
      try {
        dependencies = JSON.parse(step.dependencies || '[]');
      } catch (e) {
        dependencies = [];
      }
      
      // 检查所有依赖步骤是否已完成
      for (const depOrder of dependencies) {
        const depStep = steps.find(s => s.step_order === depOrder);
        if (!depStep || depStep.status !== 'completed') {
          return false;
        }
      }
      
      return true;
    };
    
    // 生成所有可执行的待办事项（支持并行）
    const todos = [];
    for (const step of steps) {
      if (canExecuteStep(step)) {
        const flowInfo = flowTypeMap[step.notes] || { label: step.notes, icon: '📋' };
        todos.push({
          id: `step-${step.id}`,
          title: step.step_name,
          description: `执行${step.step_name}`,
          flowType: step.notes,
          flowLabel: flowInfo.label,
          flowIcon: flowInfo.icon,
          priority: 'high',
          estimatedTime: step.estimated_duration || 0,
          action: 'operate',
          stepId: step.id,
          taskId: id,
        });
      }
      // 添加需要确认完成的步骤
      if (step.status === 'in_progress') {
        const flowInfo = flowTypeMap[step.notes] || { label: step.notes, icon: '📋' };
        todos.push({
          id: `confirm-${step.id}`,
          title: `确认${step.step_name}完成`,
          description: `请确认${step.step_name}是否已完成`,
          flowType: step.notes,
          flowLabel: flowInfo.label,
          flowIcon: flowInfo.icon,
          priority: 'medium',
          estimatedTime: 2,
          action: 'confirm',
          stepId: step.id,
          taskId: id,
        });
      }
    }
    
    res.json({ success: true, data: todos });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router; 