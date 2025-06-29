// 任务状态枚举
export enum TaskStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  FAILED = 'failed'
}

// 步骤状态枚举
export enum StepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

// 服务类型枚举
export enum ServiceType {
  DS = 'DS',
  SERVICE = 'SERVICE',
  API = 'API'
}

// 地区枚举
export enum Region {
  DOMESTIC = '国内',
  INTERNATIONAL = '国际'
}

// IDC枚举
export enum IDC {
  IDC1 = 'IDC1',
  IDC2 = 'IDC2',
  MIXED = '混合部署'
}

// 分组枚举
export enum GroupName {
  GROUP_A = 'A组',
  GROUP_B = 'B组',
  NOT_APPLICABLE = '不适用'
}

// 核心程度枚举
export enum CoreLevel {
  CORE = '核心',
  NON_CORE = '非核心'
}

// 任务接口
export interface Task {
  id: number;
  name: string;
  description?: string;
  status: TaskStatus;
  startTime?: string;
  endTime?: string;
  configSnapshot?: string;
  createdTime: string;
  updatedTime: string;
}

// 任务步骤接口
export interface TaskStep {
  id: number;
  taskId: number;
  stepOrder: number;
  stepName: string;
  stepType: string;
  status: StepStatus;
  startTime?: string;
  endTime?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  notes?: string;
  reminderTime?: string;
  dependencies?: string;
  serviceConfig?: string;
  createdTime: string;
}

// 服务配置接口
export interface Service {
  id: number;
  name: string;
  displayName: string;
  type: ServiceType;
  region: Region;
  coreLevel: CoreLevel;
  idc: IDC;
  groupName?: GroupName;
  servicePath?: string;
  managementUrl?: string;
  isActive: boolean;
  createdTime: string;
}

// 消息记录接口
export interface Message {
  id: number;
  taskId: number;
  stepId?: number;
  messageType: string;
  messageContent: string;
  isSent: boolean;
  createdTime: string;
}

// 配置接口
export interface Config {
  id: number;
  configKey: string;
  configValue: string;
  description?: string;
  updatedTime: string;
}

// 待办事项接口
export interface TodoItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number;
  action: 'operate' | 'confirm';
  stepId?: number;
  taskId: number;
}

// API响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 分页接口
export interface Pagination {
  current: number;
  pageSize: number;
  total: number;
}

// 历史记录接口
export interface HistoryRecord {
  task: Task;
  steps: TaskStep[];
  messages: Message[];
  statistics: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    totalDuration: number;
  };
}

// 消息模板接口
export interface MessageTemplate {
  id: number;
  name: string;
  type: string;
  template: string;
  variables: string[];
  isActive: boolean;
}

// 流程配置接口
export interface FlowConfig {
  taskType: string;
  steps: FlowStep[];
}

// 流程步骤配置接口
export interface FlowStep {
  name: string;
  type: string;
  description: string;
  instructions: string[];
  notes: string;
  estimatedDuration: number;
  dependencies: string[];
  serviceTypes: ServiceType[];
  links: { name: string; url: string }[];
} 