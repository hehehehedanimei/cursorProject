"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connection_1 = require("../database/connection");
const router = (0, express_1.Router)();
// 获取配置
router.get('/', async (req, res) => {
    try {
        const configs = await connection_1.Database.all('SELECT * FROM configs');
        res.json({ success: true, data: configs });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=configRoutes.js.map