import { Router } from 'express';
import { Database } from '../database/connection';

const router = Router();

// 获取配置
router.get('/', async (req, res) => {
  try {
    const configs = await Database.all('SELECT * FROM configs');
    res.json({ success: true, data: configs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router; 