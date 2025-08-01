import { ThunkAction } from '@reduxjs/toolkit';
import { RootState } from '../store/store';

// This file should only contain type definitions, not runtime code
// to avoid circular dependencies
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  any
>;
