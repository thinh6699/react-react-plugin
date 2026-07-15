import {
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from 'react-redux'
import type { AppDispatch, RootState } from './index'

/** Typed Redux hooks — ready when you move logic off useState. */
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
