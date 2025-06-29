import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TaskStep, StepStatus, TodoItem } from '../../types';
import { stepApi } from '../../services/api';

// 异步获取任务步骤
export const fetchSteps = createAsyncThunk(
  'step/fetchSteps',
  async (taskId: number) => {
    const response = await stepApi.getSteps(taskId);
    return response.data;
  }
);

// 异步更新步骤
export const updateStep = createAsyncThunk(
  'step/updateStep',
  async ({ id, data }: { id: number; data: Partial<TaskStep> }) => {
    const response = await stepApi.updateStep(id, data);
    return response.data;
  }
);

// 异步复制通知消息
export const copyMessage = createAsyncThunk(
  'step/copyMessage',
  async (stepId: number) => {
    const response = await stepApi.copyMessage(stepId);
    return response.data.data || '';
  }
);

interface StepState {
  steps: TaskStep[];
  currentStep: TaskStep | null;
  todoList: TodoItem[];
  loading: boolean;
  error: string | null;
}

const initialState: StepState = {
  steps: [],
  currentStep: null,
  todoList: [],
  loading: false,
  error: null,
};

const stepSlice = createSlice({
  name: 'step',
  initialState,
  reducers: {
    setCurrentStep: (state, action: PayloadAction<TaskStep | null>) => {
      state.currentStep = action.payload;
    },
    updateStepStatus: (state, action: PayloadAction<{ id: number; status: StepStatus; notes?: string }>) => {
      const step = state.steps.find(s => s.id === action.payload.id);
      if (step) {
        step.status = action.payload.status;
        if (action.payload.notes) {
          step.notes = action.payload.notes;
        }
        if (action.payload.status === StepStatus.IN_PROGRESS) {
          step.startTime = new Date().toISOString();
        } else if (action.payload.status === StepStatus.COMPLETED) {
          step.endTime = new Date().toISOString();
          if (step.startTime) {
            const duration = Math.floor((new Date().getTime() - new Date(step.startTime).getTime()) / 60000);
            step.actualDuration = duration;
          }
        }
      }
      if (state.currentStep && state.currentStep.id === action.payload.id) {
        state.currentStep.status = action.payload.status;
        if (action.payload.notes) {
          state.currentStep.notes = action.payload.notes;
        }
      }
    },
    generateTodoList: (state, action: PayloadAction<number>) => {
      const taskId = action.payload;
      const taskSteps = state.steps.filter(s => s.taskId === taskId);
      
      // 生成待办事项逻辑
      const todos: TodoItem[] = [];
      
      // 找到下一个需要执行的步骤
      const nextStep = taskSteps.find(s => s.status === StepStatus.PENDING);
      if (nextStep) {
        todos.push({
          id: `step-${nextStep.id}`,
          title: nextStep.stepName,
          description: `执行${nextStep.stepName}`,
          priority: 'high',
          estimatedTime: nextStep.estimatedDuration || 0,
          action: 'operate',
          stepId: nextStep.id,
          taskId: taskId,
        });
      }
      
      // 找到需要确认的步骤
      const confirmSteps = taskSteps.filter(s => s.status === StepStatus.IN_PROGRESS);
      confirmSteps.forEach(step => {
        todos.push({
          id: `confirm-${step.id}`,
          title: `确认${step.stepName}完成`,
          description: `请确认${step.stepName}是否已完成`,
          priority: 'medium',
          estimatedTime: 5,
          action: 'confirm',
          stepId: step.id,
          taskId: taskId,
        });
      });
      
      state.todoList = todos;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取步骤列表
      .addCase(fetchSteps.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSteps.fulfilled, (state, action) => {
        state.loading = false;
        state.steps = action.payload.data || [];
      })
      .addCase(fetchSteps.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取步骤列表失败';
      })
      // 更新步骤
      .addCase(updateStep.fulfilled, (state, action) => {
        const data = action.payload.data;
        if (data) {
          const index = state.steps.findIndex(s => s.id === data.id);
          if (index !== -1) {
            state.steps[index] = data;
          }
          if (state.currentStep && state.currentStep.id === data.id) {
            state.currentStep = data;
          }
        }
      })
      // 复制消息
      .addCase(copyMessage.fulfilled, () => {
        // 消息复制成功的处理逻辑
      });
  },
});

export const { setCurrentStep, updateStepStatus, generateTodoList, clearError } = stepSlice.actions;
export default stepSlice.reducer; 