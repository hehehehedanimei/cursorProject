import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Service } from '../../types';
import { serviceApi } from '../../services/api';

// 异步获取服务列表
export const fetchServices = createAsyncThunk(
  'service/fetchServices',
  async () => {
    const response = await serviceApi.getServices();
    return response.data;
  }
);

// 异步创建服务
export const createService = createAsyncThunk(
  'service/createService',
  async (serviceData: Partial<Service>) => {
    const response = await serviceApi.createService(serviceData);
    return response.data;
  }
);

// 异步更新服务
export const updateService = createAsyncThunk(
  'service/updateService',
  async ({ id, data }: { id: number; data: Partial<Service> }) => {
    const response = await serviceApi.updateService(id, data);
    return response.data;
  }
);

// 异步删除服务
export const deleteService = createAsyncThunk(
  'service/deleteService',
  async (id: number) => {
    await serviceApi.deleteService(id);
    return id;
  }
);

interface ServiceState {
  services: Service[];
  loading: boolean;
  error: string | null;
  filters: {
    type?: string;
    region?: string;
    idc?: string;
    status?: string;
  };
}

const initialState: ServiceState = {
  services: [],
  loading: false,
  error: null,
  filters: {},
};

const serviceSlice = createSlice({
  name: 'service',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<ServiceState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取服务列表
      .addCase(fetchServices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.loading = false;
        state.services = action.payload.data || [];
      })
      .addCase(fetchServices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取服务列表失败';
      })
      // 创建服务
      .addCase(createService.fulfilled, (state, action) => {
        if (action.payload.data) {
          state.services.push(action.payload.data);
        }
      })
      // 更新服务
      .addCase(updateService.fulfilled, (state, action) => {
        const data = action.payload.data;
        if (data) {
          const index = state.services.findIndex(s => s.id === data.id);
          if (index !== -1) {
            state.services[index] = data;
          }
        }
      })
      // 删除服务
      .addCase(deleteService.fulfilled, (state, action) => {
        state.services = state.services.filter(s => s.id !== action.payload);
      });
  },
});

export const { setFilters, clearFilters, clearError } = serviceSlice.actions;
export default serviceSlice.reducer; 