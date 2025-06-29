import { Database } from '../database/connection';

export async function createSampleData() {
  try {
    console.log('开始创建示例历史记录数据...');
    
    // 创建示例任务
    const sampleTasks = [
      {
        name: 'goods-ds服务上线-2024年6月版本',
        description: '更新商品数据服务，修复商品查询bug，优化性能',
        status: 'completed',
        start_time: '2024-06-25 09:00:00',
        end_time: '2024-06-25 16:30:00',
        created_time: '2024-06-25 08:30:00',
        updated_time: '2024-06-25 16:30:00'
      },
      {
        name: 'goods-service API更新',
        description: '新增商品推荐接口，支持多语言',
        status: 'completed',
        start_time: '2024-06-20 14:00:00',
        end_time: '2024-06-20 18:45:00',
        created_time: '2024-06-20 13:30:00',
        updated_time: '2024-06-20 18:45:00'
      },
      {
        name: '国际版商品服务紧急修复',
        description: '修复国际版商品价格显示错误问题',
        status: 'failed',
        start_time: '2024-06-18 10:30:00',
        end_time: '2024-06-18 12:00:00',
        created_time: '2024-06-18 10:00:00',
        updated_time: '2024-06-18 12:00:00'
      }
    ];

    // 插入任务数据
    for (const task of sampleTasks) {
      const result = await Database.run(
        `INSERT INTO tasks (name, description, status, start_time, end_time, created_time, updated_time) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [task.name, task.description, task.status, task.start_time, task.end_time, task.created_time, task.updated_time]
      );
      
      const taskId = result.lastID;
      console.log(`创建任务: ${task.name} (ID: ${taskId})`);

      // 为每个任务创建步骤
      const steps = [
        {
          step_order: 1,
          step_name: '部署DS服务-国内IDC1-A组',
          step_type: 'deployment',
          status: task.status === 'failed' && task.name.includes('紧急修复') ? 'failed' : 'completed',
          start_time: task.start_time,
          end_time: addMinutes(task.start_time, 30),
          estimated_duration: 30,
          actual_duration: 30
        },
        {
          step_order: 2,
          step_name: '部署DS服务-国内IDC1-B组',
          step_type: 'deployment',
          status: task.status === 'failed' && task.name.includes('紧急修复') ? 'pending' : 'completed',
          start_time: addMinutes(task.start_time, 30),
          end_time: addMinutes(task.start_time, 60),
          estimated_duration: 30,
          actual_duration: 30
        },
        {
          step_order: 3,
          step_name: 'AB组流量切换',
          step_type: 'traffic_switch',
          status: task.status === 'failed' && task.name.includes('紧急修复') ? 'pending' : 'completed',
          start_time: addMinutes(task.start_time, 60),
          end_time: addMinutes(task.start_time, 90),
          estimated_duration: 15,
          actual_duration: 15
        },
        {
          step_order: 4,
          step_name: '健康检查和验证',
          step_type: 'verification',
          status: task.status === 'failed' && task.name.includes('紧急修复') ? 'pending' : 'completed',
          start_time: addMinutes(task.start_time, 90),
          end_time: addMinutes(task.start_time, 120),
          estimated_duration: 30,
          actual_duration: 25
        }
      ];

      for (const step of steps) {
        const stepResult = await Database.run(
          `INSERT INTO task_steps (
            task_id, step_order, step_name, step_type, status, 
            start_time, end_time, estimated_duration, actual_duration, created_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            taskId, step.step_order, step.step_name, step.step_type, step.status,
            step.start_time, step.end_time, step.estimated_duration, step.actual_duration,
            task.created_time
          ]
        );

        // 为每个步骤创建消息记录
        await Database.run(
          `INSERT INTO messages (task_id, step_id, message_type, message_content, is_sent, created_time)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            taskId,
            stepResult.lastID,
            'deployment_notification',
            `🚀 开始执行: ${step.step_name}\n时间: ${step.start_time}\n预计耗时: ${step.estimated_duration}分钟`,
            1,
            step.start_time
          ]
        );

        if (step.status === 'completed') {
          await Database.run(
            `INSERT INTO messages (task_id, step_id, message_type, message_content, is_sent, created_time)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              taskId,
              stepResult.lastID,
              'completion_notification',
              `✅ 完成: ${step.step_name}\n开始时间: ${step.start_time}\n完成时间: ${step.end_time}\n实际耗时: ${step.actual_duration}分钟`,
              1,
              step.end_time
            ]
          );
        }
      }
    }

    console.log('✅ 示例历史记录数据创建完成！');
    console.log(`- 创建了 ${sampleTasks.length} 个历史任务`);
    console.log('- 每个任务包含 4 个步骤和相关消息');
    
  } catch (error) {
    console.error('❌ 创建示例数据失败:', error);
    throw error;
  }
}

// 辅助函数：给时间字符串添加分钟
function addMinutes(timeStr: string, minutes: number): string {
  const date = new Date(timeStr);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// 如果直接运行此脚本
if (require.main === module) {
  createSampleData()
    .then(() => {
      console.log('示例数据创建完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('创建示例数据失败:', error);
      process.exit(1);
    });
} 