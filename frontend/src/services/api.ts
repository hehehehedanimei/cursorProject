import axios, { AxiosResponse } from 'axios';
import { 
  Task, 
  TaskStep, 
  Service, 
  Config, 
  MessageTemplate, 
  HistoryRecord,
  ApiResponse 
} from '../types';

// 字段名转换函数：snake_case 转 camelCase
const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
};

// 递归转换对象字段名
const convertKeysToCamelCase = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamelCase);
  }
  
  if (typeof obj === 'object') {
    const converted: any = {};
    Object.keys(obj).forEach(key => {
      const camelKey = toCamelCase(key);
      converted[camelKey] = convertKeysToCamelCase(obj[key]);
    });
    return converted;
  }
  
  return obj;
};

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证token等
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    if (response.data.success) {
      // 转换字段名为camelCase
      if (response.data.data) {
        response.data.data = convertKeysToCamelCase(response.data.data);
      }
      return response;
    } else {
      return Promise.reject(new Error(response.data.message || '请求失败'));
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 任务相关API
export const taskApi = {
  // 获取任务列表
  getTasks: (): Promise<AxiosResponse<ApiResponse<Task[]>>> => {
    return api.get('/tasks');
  },
  
  // 创建任务
  createTask: (data: Partial<Task>): Promise<AxiosResponse<ApiResponse<Task>>> => {
    return api.post('/tasks', data);
  },
  
  // 更新任务
  updateTask: (id: number, data: Partial<Task>): Promise<AxiosResponse<ApiResponse<Task>>> => {
    return api.put(`/tasks/${id}`, data);
  },
  
  // 删除任务
  deleteTask: (id: number): Promise<AxiosResponse<ApiResponse>> => {
    return api.delete(`/tasks/${id}`);
  },
  
  // 获取当前任务
  getCurrentTask: (): Promise<AxiosResponse<ApiResponse<Task | null>>> => {
    return api.get('/tasks/current');
  },
};

// 步骤相关API
export const stepApi = {
  // 获取任务步骤
  getSteps: (taskId: number): Promise<AxiosResponse<ApiResponse<TaskStep[]>>> => {
    return api.get(`/tasks/${taskId}/steps`);
  },
  
  // 更新步骤
  updateStep: (id: number, data: Partial<TaskStep>): Promise<AxiosResponse<ApiResponse<TaskStep>>> => {
    return api.put(`/steps/${id}`, data);
  },
  
  // 复制通知消息
  copyMessage: (stepId: number): Promise<AxiosResponse<ApiResponse<string>>> => {
    return api.post(`/steps/${stepId}/copy`);
  },
  
  // 获取待办事项
  getTodoList: (taskId: number): Promise<AxiosResponse<ApiResponse<any[]>>> => {
    return api.get(`/tasks/${taskId}/todos`);
  },
};

// 服务配置相关API
export const serviceApi = {
  // 获取服务列表
  getServices: (): Promise<AxiosResponse<ApiResponse<Service[]>>> => {
    return api.get('/services');
  },
  
  // 创建服务
  createService: (data: Partial<Service>): Promise<AxiosResponse<ApiResponse<Service>>> => {
    return api.post('/services', data);
  },
  
  // 更新服务
  updateService: (id: number, data: Partial<Service>): Promise<AxiosResponse<ApiResponse<Service>>> => {
    return api.put(`/services/${id}`, data);
  },
  
  // 删除服务
  deleteService: (id: number): Promise<AxiosResponse<ApiResponse>> => {
    return api.delete(`/services/${id}`);
  },
  
  // 批量导入服务
  importServices: (data: Service[]): Promise<AxiosResponse<ApiResponse<Service[]>>> => {
    return api.post('/services/import', { services: data });
  },
};

// 配置相关API
export const configApi = {
  // 获取配置
  getConfigs: (): Promise<AxiosResponse<ApiResponse<Config[]>>> => {
    return api.get('/configs');
  },
  
  // 更新配置
  updateConfig: (key: string, value: string): Promise<AxiosResponse<ApiResponse<Config>>> => {
    return api.put('/configs', { key, value });
  },
  
  // 获取消息模板
  getTemplates: (): Promise<AxiosResponse<ApiResponse<MessageTemplate[]>>> => {
    return api.get('/templates');
  },
  
  // 更新消息模板
  updateTemplate: (id: number, data: Partial<MessageTemplate>): Promise<AxiosResponse<ApiResponse<MessageTemplate>>> => {
    return api.put(`/templates/${id}`, data);
  },
};

// 历史记录相关API
export const historyApi = {
  // 获取历史记录
  getHistory: (params: { page: number; pageSize: number }): Promise<AxiosResponse<ApiResponse<{ records: HistoryRecord[]; pagination: any }>>> => {
    return api.get('/history', { params });
  },
  
  // 获取历史记录详情
  getHistoryDetail: (taskId: number): Promise<AxiosResponse<ApiResponse<HistoryRecord>>> => {
    return api.get(`/history/${taskId}`);
  },
  
  // 导出历史记录
  exportHistory: (taskId: number): Promise<AxiosResponse<ApiResponse<string>>> => {
    return api.get(`/history/${taskId}/export`);
  },
}; 