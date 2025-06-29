import { Router } from 'express';
import { Database } from '../database/connection';

const router = Router();

// 获取所有服务
router.get('/', async (req, res) => {
  try {
    const services = await Database.all('SELECT * FROM services WHERE is_active = 1');
    res.json({ success: true, data: services });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建服务
router.post('/', async (req, res) => {
  try {
    const { name, displayName, type, region, coreLevel, idc, groupName, servicePath, managementUrl } = req.body;
    
    const result = await Database.run(
      `INSERT INTO services (name, display_name, type, region, core_level, idc, group_name, service_path, management_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, displayName, type, region, coreLevel, idc, groupName, servicePath, managementUrl]
    );
    
    const service = await Database.get('SELECT * FROM services WHERE id = ?', [result.lastID]);
    res.json({ success: true, data: service });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router; 