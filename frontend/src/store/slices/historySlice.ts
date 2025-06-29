import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { HistoryRecord, Pagination } from '../../types';
import { historyApi } from '../../services/api';

// 异步获取历史记录
export const fetchHistory = createAsyncThunk(
  'history/fetchHistory',
  async (params: { page: number; pageSize: number }) => {
    const response = await historyApi.getHistory(params);
    return response.data;
  }
);

// 异步获取历史记录详情
export const fetchHistoryDetail = createAsyncThunk(
  'history/fetchHistoryDetail',
  async (taskId: number) => {
    const response = await historyApi.getHistoryDetail(taskId);
    return response.data;
  }
);

// 异步导出历史记录
export const exportHistory = createAsyncThunk(
  'history/exportHistory',
  async (taskId: number) => {
    const response = await historyApi.exportHistory(taskId);
    return response.data;
  }
);

interface HistoryState {
  records: HistoryRecord[];
  currentRecord: HistoryRecord | null;
  pagination: Pagination;
  loading: boolean;
  error: string | null;
}

const initialState: HistoryState = {
  records: [],
  currentRecord: null,
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0,
  },
  loading: false,
  error: null,
};

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    setCurrentRecord: (state, action: PayloadAction<HistoryRecord | null>) => {
      state.currentRecord = action.payload;
    },
    setPagination: (state, action: PayloadAction<Partial<Pagination>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取历史记录
      .addCase(fetchHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.records = action.payload.data?.records || [];
        state.pagination = action.payload.data?.pagination || { current: 1, pageSize: 10, total: 0 };
      })
      .addCase(fetchHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取历史记录失败';
      })
      // 获取历史记录详情
      .addCase(fetchHistoryDetail.fulfilled, (state, action) => {
        state.currentRecord = action.payload.data || null;
      })
      // 导出历史记录
      .addCase(exportHistory.fulfilled, () => {
        // 导出成功的处理逻辑
      });
  },
});

export const { setCurrentRecord, setPagination, clearError } = historySlice.actions;
export default historySlice.reducer; 