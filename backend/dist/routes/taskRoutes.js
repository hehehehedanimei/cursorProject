"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connection_1 = require("../database/connection");
const flowGenerator_1 = require("../utils/flowGenerator");
const router = (0, express_1.Router)();
// 获取所有任务
router.get('/', async (req, res) => {
    try {
        const tasks = await connection_1.Database.all('SELECT * FROM tasks ORDER BY created_time DESC');
        res.json({ success: true, data: tasks });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// 获取流程类型列表
router.get('/flow-types', async (req, res) => {
    try {
        const flowTypes = (0, flowGenerator_1.getSupportedFlowTypes)();
        res.json({ success: true, data: flowTypes });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// 获取当前任务
router.get('/current', async (req, res) => {
    try {
        const task = await connection_1.Database.get('SELECT * FROM tasks WHERE status = ? ORDER BY created_time DESC LIMIT 1', ['in_progress']);
        res.json({ success: true, data: task || null });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// 获取单个任务
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const task = await connection_1.Database.get('SELECT * FROM tasks WHERE id = ?', [id]);
        if (!task) {
            return res.status(404).json({ success: false, message: '任务不存在' });
        }
        res.json({ success: true, data: task });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// 创建新任务
router.post('/', async (req, res) => {
    try {
        const { name, description, flowTypes } = req.body;
        const result = await connection_1.Database.run('INSERT INTO tasks (name, description, status) VALUES (?, ?, ?)', [name, description || '', 'draft']);
        const taskId = result.lastID;
        // 生成选定的流程步骤
        const selectedFlowTypes = flowTypes || ['domestic_non_core'];
        await (0, flowGenerator_1.generateStepsForTask)(taskId, selectedFlowTypes);
        const task = await connection_1.Database.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
        res.json({ success: true, data: task });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// 更新任务
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, status, startTime, endTime } = req.body;
        await connection_1.Database.run(`UPDATE tasks SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        updated_time = CURRENT_TIMESTAMP
       WHERE id = ?`, [name, description, status, startTime, endTime, id]);
        const task = await connection_1.Database.get('SELECT * FROM tasks WHERE id = ?', [id]);
        res.json({ success: true, data: task });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// 删除任务
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await connection_1.Database.run('DELETE FROM tasks WHERE id = ?', [id]);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// 获取任务的步骤
router.get('/:id/steps', async (req, res) => {
    try {
        const { id } = req.params;
        const steps = await connection_1.Database.all('SELECT * FROM task_steps WHERE task_id = ? ORDER BY step_order', [id]);
        res.json({ success: true, data: steps });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// 获取任务的待办事项
router.get('/:id/todos', async (req, res) => {
    try {
        const { id } = req.params;
        const steps = await connection_1.Database.all('SELECT * FROM task_steps WHERE task_id = ? ORDER BY step_order', [id]);
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=taskRoutes.js.map