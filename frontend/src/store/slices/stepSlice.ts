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

// 异步获取待办事项
export const fetchTodoList = createAsyncThunk(
  'step/fetchTodoList',
  async (taskId: number) => {
    const response = await fetch(`/api/tasks/${taskId}/todos`);
    const data = await response.json();
    return data;
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
    // 保留本地generateTodoList以备用，但现在主要使用fetchTodoList
    generateTodoList: (_, action: PayloadAction<number>) => {
      // 这个函数现在主要用于兼容性，实际应该调用fetchTodoList
      console.log('⚠️ 使用了本地generateTodoList，应该使用fetchTodoList:', action.payload);
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
      })
      // 获取待办事项
      .addCase(fetchTodoList.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTodoList.fulfilled, (state, action) => {
        state.loading = false;
        state.todoList = action.payload.data || [];
      })
      .addCase(fetchTodoList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取待办事项失败';
      });
  },
});

export const { setCurrentStep, updateStepStatus, generateTodoList, clearError } = stepSlice.actions;
export default stepSlice.reducer; 