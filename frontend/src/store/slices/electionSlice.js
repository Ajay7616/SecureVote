import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  elections: [],      // all elections
  selectedElection: {}, // single election details
  loading: false,     // optional loading state
  error: null,        // optional error
};

const electionSlice = createSlice({
  name: 'election',
  initialState,
  reducers: {
    setElections: (state, action) => {
      state.elections = action.payload; // set all elections
    },
    setSelectedElection: (state, action) => {
      state.selectedElection = action.payload; // set single election
    },
    addElection: (state, action) => {
      state.elections.push(action.payload); // add new election
    },
    updateElection: (state, action) => {
      const index = state.elections.findIndex(e => e.id === action.payload.id);
      if (index !== -1) state.elections[index] = action.payload;
      // if currently selected election is updated, update that too
      if (state.selectedElection.id === action.payload.id) {
        state.selectedElection = action.payload;
      }
    },
    deleteElection: (state, action) => {
      state.elections = state.elections.filter(e => e.id !== action.payload);
      if (state.selectedElection.id === action.payload) {
        state.selectedElection = {};
      }
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearSelectedElection: (state) => {
      state.selectedElection = {};
    },
  },
});

export const {
  setElections,
  setSelectedElection,
  addElection,
  updateElection,
  deleteElection,
  setLoading,
  setError,
  clearSelectedElection,
} = electionSlice.actions;

export default electionSlice.reducer;
