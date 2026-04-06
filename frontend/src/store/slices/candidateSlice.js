import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  candidates: [],        // all candidates
  selectedCandidate: {}, // single candidate details
  loading: false,        // optional loading state
  error: null,           // optional error
};

const candidateSlice = createSlice({
  name: 'candidate',
  initialState,
  reducers: {
    setCandidates: (state, action) => {
      state.candidates = action.payload; // set all candidates
    },
    setSelectedCandidate: (state, action) => {
      state.selectedCandidate = action.payload; // set single candidate
    },
    addCandidate: (state, action) => {
      state.candidates.push(action.payload); // add new candidate
    },
    updateCandidate: (state, action) => {
      const index = state.candidates.findIndex(
        c => c.id === action.payload.id
      );

      if (index !== -1) state.candidates[index] = action.payload;

      // update selected candidate if it's the same one
      if (state.selectedCandidate.id === action.payload.id) {
        state.selectedCandidate = action.payload;
      }
    },
    deleteCandidate: (state, action) => {
      state.candidates = state.candidates.filter(
        c => c.id !== action.payload
      );

      if (state.selectedCandidate.id === action.payload) {
        state.selectedCandidate = {};
      }
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearSelectedCandidate: (state) => {
      state.selectedCandidate = {};
    },
  },
});

export const {
  setCandidates,
  setSelectedCandidate,
  addCandidate,
  updateCandidate,
  deleteCandidate,
  setLoading,
  setError,
  clearSelectedCandidate,
} = candidateSlice.actions;

export default candidateSlice.reducer;