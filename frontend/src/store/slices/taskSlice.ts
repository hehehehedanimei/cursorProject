import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Task, TaskStatus } from '../../types';
import { taskApi } from '../../services/api';

// 异步获取任务列表
export const fetchTasks = createAsyncThunk(
  'task/fetchTasks',
  async () => {
    const response = await taskApi.getTasks();
    return response.data;
  }
);

// 异步创建任务
export const createTask = createAsyncThunk(
  'task/createTask',
  async (taskData: Partial<Task>) => {
    const response = await taskApi.createTask(taskData);
    return response.data;
  }
);

// 异步更新任务
export const updateTask = createAsyncThunk(
  'task/updateTask',
  async ({ id, data }: { id: number; data: Partial<Task> }) => {
    const response = await taskApi.updateTask(id, data);
    return response.data;
  }
);

// 异步删除任务
export const deleteTask = createAsyncThunk(
  'task/deleteTask',
  async (id: number) => {
    await taskApi.deleteTask(id);
    return id;
  }
);

// 异步获取当前任务
export const fetchCurrentTask = createAsyncThunk(
  'task/fetchCurrentTask',
  async () => {
    const response = await taskApi.getCurrentTask();
    return response.data;
  }
);

interface TaskState {
  tasks: Task[];
  currentTask: Task | null;
  loading: boolean;
  error: string | null;
}

const initialState: TaskState = {
  tasks: [],
  currentTask: null,
  loading: false,
  error: null,
};

const taskSlice = createSlice({
  name: 'task',
  initialState,
  reducers: {
    setCurrentTask: (state, action: PayloadAction<Task | null>) => {
      state.currentTask = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateTaskStatus: (state, action: PayloadAction<{ id: number; status: TaskStatus }>) => {
      const task = state.tasks.find(t => t.id === action.payload.id);
      if (task) {
        task.status = action.payload.status;
        task.updatedTime = new Date().toISOString();
      }
      if (state.currentTask && state.currentTask.id === action.payload.id) {
        state.currentTask.status = action.payload.status;
        state.currentTask.updatedTime = new Date().toISOString();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取任务列表
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload.data || [];
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取任务列表失败';
      })
      // 创建任务
      .addCase(createTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.data) {
          state.tasks.push(action.payload.data);
          state.currentTask = action.payload.data;
        }
      })
      .addCase(createTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '创建任务失败';
      })
      // 更新任务
      .addCase(updateTask.fulfilled, (state, action) => {
        const data = action.payload.data;
        if (data) {
          const index = state.tasks.findIndex(t => t.id === data.id);
          if (index !== -1) {
            state.tasks[index] = data;
          }
          if (state.currentTask && state.currentTask.id === data.id) {
            state.currentTask = data;
          }
        }
      })
      // 删除任务
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter(t => t.id !== action.payload);
        if (state.currentTask && state.currentTask.id === action.payload) {
          state.currentTask = null;
        }
      })
      // 获取当前任务
      .addCase(fetchCurrentTask.fulfilled, (state, action) => {
        state.currentTask = action.payload.data || null;
      });
  },
});

export const { setCurrentTask, clearError, updateTaskStatus } = taskSlice.actions;
export default taskSlice.reducer; 