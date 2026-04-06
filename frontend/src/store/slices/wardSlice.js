import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  wards: [],           // all wards
  selectedWard: {},    // single ward details
  loading: false,      // optional loading state
  error: null,         // optional error
};

const wardSlice = createSlice({
  name: 'ward',
  initialState,
  reducers: {
    setWards: (state, action) => {
      state.wards = action.payload; // set all wards
    },
    setSelectedWard: (state, action) => {
      state.selectedWard = action.payload; // set single ward
    },
    addWard: (state, action) => {
      state.wards.push(action.payload); // add new ward
    },
    updateWard: (state, action) => {
      const index = state.wards.findIndex(w => w.id === action.payload.id);
      if (index !== -1) state.wards[index] = action.payload;
      // if currently selected ward is updated, update that too
      if (state.selectedWard.id === action.payload.id) {
        state.selectedWard = action.payload;
      }
    },
    deleteWard: (state, action) => {
      state.wards = state.wards.filter(w => w.id !== action.payload);
      if (state.selectedWard.id === action.payload) {
        state.selectedWard = {};
      }
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearSelectedWard: (state) => {
      state.selectedWard = {};
    },
  },
});

export const {
  setWards,
  setSelectedWard,
  addWard,
  updateWard,
  deleteWard,
  setLoading,
  setError,
  clearSelectedWard,
} = wardSlice.actions;

export default wardSlice.reducer;
