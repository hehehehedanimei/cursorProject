import { Router } from 'express';
import { Database } from '../database/connection';

const router = Router();

// 获取历史记录列表
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const offset = (page - 1) * pageSize;

    // 获取已完成或失败的任务
    const tasks = await Database.all(
      `SELECT * FROM tasks 
       WHERE status IN ('completed', 'failed') 
       ORDER BY updated_time DESC 
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );

    // 获取总数
    const countResult = await Database.get(
      `SELECT COUNT(*) as total FROM tasks 
       WHERE status IN ('completed', 'failed')`
    );
    const total = countResult?.total || 0;

    // 为每个任务构建详细记录
    const records = [];
    for (const task of tasks) {
      // 获取任务的所有步骤
      const steps = await Database.all(
        'SELECT * FROM task_steps WHERE task_id = ? ORDER BY step_order',
        [task.id]
      );

      // 获取任务的所有消息
      const messages = await Database.all(
        'SELECT * FROM messages WHERE task_id = ? ORDER BY created_time',
        [task.id]
      );

      // 计算统计信息
      const totalSteps = steps.length;
      const completedSteps = steps.filter(s => s.status === 'completed').length;
      const failedSteps = steps.filter(s => s.status === 'failed').length;
      
      let totalDuration = 0;
      if (task.start_time && task.end_time) {
        totalDuration = Math.floor((new Date(task.end_time).getTime() - new Date(task.start_time).getTime()) / 60000);
      }

      records.push({
        task: {
          id: task.id,
          name: task.name,
          description: task.description,
          status: task.status,
          startTime: task.start_time,
          endTime: task.end_time,
          createdTime: task.created_time,
          updatedTime: task.updated_time
        },
        steps: steps.map(step => ({
          id: step.id,
          taskId: step.task_id,
          stepOrder: step.step_order,
          stepName: step.step_name,
          stepType: step.step_type,
          status: step.status,
          startTime: step.start_time,
          endTime: step.end_time,
          estimatedDuration: step.estimated_duration,
          actualDuration: step.actual_duration,
          notes: step.notes,
          createdTime: step.created_time
        })),
        messages: messages.map(msg => ({
          id: msg.id,
          taskId: msg.task_id,
          stepId: msg.step_id,
          messageType: msg.message_type,
          messageContent: msg.message_content,
          isSent: msg.is_sent,
          createdTime: msg.created_time
        })),
        statistics: {
          totalSteps,
          completedSteps,
          failedSteps,
          totalDuration
        }
      });
    }

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          current: page,
          pageSize,
          total
        }
      }
    });
  } catch (error: any) {
    console.error('获取历史记录失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取历史记录详情
router.get('/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    // 获取任务信息
    const task = await Database.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!task) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }

    // 获取步骤信息
    const steps = await Database.all(
      'SELECT * FROM task_steps WHERE task_id = ? ORDER BY step_order',
      [taskId]
    );

    // 获取消息信息
    const messages = await Database.all(
      'SELECT * FROM messages WHERE task_id = ? ORDER BY created_time',
      [taskId]
    );

    // 计算统计信息
    const totalSteps = steps.length;
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const failedSteps = steps.filter(s => s.status === 'failed').length;
    
    let totalDuration = 0;
    if (task.start_time && task.end_time) {
      totalDuration = Math.floor((new Date(task.end_time).getTime() - new Date(task.start_time).getTime()) / 60000);
    }

    const record = {
      task: {
        id: task.id,
        name: task.name,
        description: task.description,
        status: task.status,
        startTime: task.start_time,
        endTime: task.end_time,
        createdTime: task.created_time,
        updatedTime: task.updated_time
      },
      steps: steps.map(step => ({
        id: step.id,
        taskId: step.task_id,
        stepOrder: step.step_order,
        stepName: step.step_name,
        stepType: step.step_type,
        status: step.status,
        startTime: step.start_time,
        endTime: step.end_time,
        estimatedDuration: step.estimated_duration,
        actualDuration: step.actual_duration,
        notes: step.notes,
        createdTime: step.created_time
      })),
      messages: messages.map(msg => ({
        id: msg.id,
        taskId: msg.task_id,
        stepId: msg.step_id,
        messageType: msg.message_type,
        messageContent: msg.message_content,
        isSent: msg.is_sent,
        createdTime: msg.created_time
      })),
      statistics: {
        totalSteps,
        completedSteps,
        failedSteps,
        totalDuration
      }
    };

    res.json({ success: true, data: record });
  } catch (error: any) {
    console.error('获取历史记录详情失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 导出历史记录
router.get('/:taskId/export', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    // 获取完整的任务记录
    const task = await Database.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!task) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }

    const steps = await Database.all(
      'SELECT * FROM task_steps WHERE task_id = ? ORDER BY step_order',
      [taskId]
    );

    const messages = await Database.all(
      'SELECT * FROM messages WHERE task_id = ? ORDER BY created_time',
      [taskId]
    );

    // 生成导出内容
    const exportData = {
      task: {
        name: task.name,
        status: task.status,
        startTime: task.start_time,
        endTime: task.end_time,
        createdTime: task.created_time
      },
      steps: steps.map(step => ({
        stepName: step.step_name,
        status: step.status,
        startTime: step.start_time,
        endTime: step.end_time,
        duration: step.actual_duration,
        notes: step.notes
      })),
      messages: messages.map(msg => ({
        type: msg.message_type,
        content: msg.message_content,
        time: msg.created_time
      }))
    };

    // 返回JSON格式的导出数据
    res.json({ 
      success: true, 
      data: JSON.stringify(exportData, null, 2) 
    });
  } catch (error: any) {
    console.error('导出历史记录失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router; 