import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  voters: [],            // all voters
  selectedVoter: {},     // single voter details
  loading: false,        // optional loading state
  error: null,           // optional error
};

const voterSlice = createSlice({
  name: 'voter',
  initialState,
  reducers: {
    setVoters: (state, action) => {
      state.voters = action.payload; // set all voters
    },

    setSelectedVoter: (state, action) => {
      state.selectedVoter = action.payload; // set single voter
    },

    addVoter: (state, action) => {
      state.voters.push(action.payload); // add new voter
    },

    updateVoter: (state, action) => {
      const index = state.voters.findIndex(
        v => v.id === action.payload.id
      );

      if (index !== -1) {
        state.voters[index] = action.payload;
      }

      // If currently selected voter is updated, update that too
      if (state.selectedVoter.id === action.payload.id) {
        state.selectedVoter = action.payload;
      }
    },

    deleteVoter: (state, action) => {
      state.voters = state.voters.filter(
        v => v.id !== action.payload
      );

      if (state.selectedVoter.id === action.payload) {
        state.selectedVoter = {};
      }
    },

    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    setError: (state, action) => {
      state.error = action.payload;
    },

    clearSelectedVoter: (state) => {
      state.selectedVoter = {};
    },
  },
});

export const {
  setVoters,
  setSelectedVoter,
  addVoter,
  updateVoter,
  deleteVoter,
  setLoading,
  setError,
  clearSelectedVoter,
} = voterSlice.actions;

export default voterSlice.reducer;