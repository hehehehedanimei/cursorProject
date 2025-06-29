import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Config, MessageTemplate } from '../../types';
import { configApi } from '../../services/api';

// 异步获取配置
export const fetchConfigs = createAsyncThunk(
  'config/fetchConfigs',
  async () => {
    const response = await configApi.getConfigs();
    return response.data;
  }
);

// 异步获取消息模板
export const fetchTemplates = createAsyncThunk(
  'config/fetchTemplates',
  async () => {
    const response = await configApi.getTemplates();
    return response.data;
  }
);

// 异步更新配置
export const updateConfig = createAsyncThunk(
  'config/updateConfig',
  async ({ key, value }: { key: string; value: string }) => {
    const response = await configApi.updateConfig(key, value);
    return response.data;
  }
);

// 异步更新模板
export const updateTemplate = createAsyncThunk(
  'config/updateTemplate',
  async ({ id, data }: { id: number; data: Partial<MessageTemplate> }) => {
    const response = await configApi.updateTemplate(id, data);
    return response.data;
  }
);

interface ConfigState {
  configs: Config[];
  templates: MessageTemplate[];
  loading: boolean;
  error: string | null;
}

const initialState: ConfigState = {
  configs: [],
  templates: [],
  loading: false,
  error: null,
};

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取配置
      .addCase(fetchConfigs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConfigs.fulfilled, (state, action) => {
        state.loading = false;
        state.configs = action.payload.data || [];
      })
      .addCase(fetchConfigs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取配置失败';
      })
      // 获取模板
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.templates = action.payload.data || [];
      })
      // 更新配置
      .addCase(updateConfig.fulfilled, (state, action) => {
        const data = action.payload.data;
        if (data) {
          const index = state.configs.findIndex(c => c.configKey === data.configKey);
          if (index !== -1) {
            state.configs[index] = data;
          } else {
            state.configs.push(data);
          }
        }
      })
      // 更新模板
      .addCase(updateTemplate.fulfilled, (state, action) => {
        const data = action.payload.data;
        if (data) {
          const index = state.templates.findIndex(t => t.id === data.id);
          if (index !== -1) {
            state.templates[index] = data;
          }
        }
      });
  },
});

export const { clearError } = configSlice.actions;
export default configSlice.reducer; 