"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connection_1 = require("../database/connection");
const router = (0, express_1.Router)();
// 更新步骤
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes, startTime, endTime } = req.body;
        await connection_1.Database.run(`UPDATE task_steps SET 
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time)
       WHERE id = ?`, [status, notes, startTime, endTime, id]);
        const step = await connection_1.Database.get('SELECT * FROM task_steps WHERE id = ?', [id]);
        res.json({ success: true, data: step });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// 复制通知消息
router.post('/:id/copy', async (req, res) => {
    try {
        const { id } = req.params;
        const step = await connection_1.Database.get('SELECT * FROM task_steps WHERE id = ?', [id]);
        if (!step) {
            return res.status(404).json({ success: false, message: '步骤不存在' });
        }
        // 简单的消息生成逻辑
        const message = `【信息同步】${step.step_name}`;
        res.json({ success: true, data: message });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=stepRoutes.js.map