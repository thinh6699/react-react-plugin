import { configureStore } from '@reduxjs/toolkit'
import exampleReducer from './exampleSlice'

/**
 * Redux store is wired and ready, but the demo UI uses useState.
 * Add slices here and use useAppSelector / useAppDispatch when needed.
 */
export const store = configureStore({
  reducer: {
    example: exampleReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
