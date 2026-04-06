import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  voter: {},
  token: '',
};

const voterSessionSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.voter = action.payload;   // ✅ FIXED
    },
    setToken: (state, action) => {
      state.token = action.payload;
    },
    logoutUser: (state) => {
      state.voter = {};
      state.token = '';
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("voter");
    },
  },
});

export const { setUser, setToken, logoutUser } = voterSessionSlice.actions;
export default voterSessionSlice.reducer;
