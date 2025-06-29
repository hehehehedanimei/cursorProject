import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import taskSlice from './slices/taskSlice';
import stepSlice from './slices/stepSlice';
import serviceSlice from './slices/serviceSlice';
import configSlice from './slices/configSlice';
import historySlice from './slices/historySlice';

export const store = configureStore({
  reducer: {
    task: taskSlice,
    step: stepSlice,
    service: serviceSlice,
    config: configSlice,
    history: historySlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// 类型化的hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector; 