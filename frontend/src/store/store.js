import { configureStore } from '@reduxjs/toolkit';
import electionReducer from './slices/electionSlice';
import candidateReducer from './slices/candidateSlice';
import voterReducer from './slices/voterSlice';
import voterSessionSlice from './slices/voterSessionSlice';
import authReducer from './slices/authSlice';
import wardReducer from './slices/wardSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    elections: electionReducer,
    candidates: candidateReducer,
    voters: voterReducer,
    votes: voterSessionSlice,
    ward: wardReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;