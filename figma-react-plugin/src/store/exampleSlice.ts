import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

/**
 * Sample slice — not used by the plugin UI yet.
 * Copy this pattern when app state grows beyond local useState.
 */
type ExampleState = {
  value: number
}

const initialState: ExampleState = {
  value: 0,
}

const exampleSlice = createSlice({
  name: 'example',
  initialState,
  reducers: {
    incremented(state) {
      state.value += 1
    },
    amountAdded(state, action: PayloadAction<number>) {
      state.value += action.payload
    },
  },
})

export const { incremented, amountAdded } = exampleSlice.actions
export default exampleSlice.reducer
