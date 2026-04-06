import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: {}, // only user
  token: '',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload; // set user directly
    },
    setToken: (state, action) => {
      state.token = action.payload;
    },
    logoutUser: (state) => {
      state.user = {};
      state.token = '';
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("voter");
    },
  },
});

export const { setUser, setToken, logoutUser } = authSlice.actions;
export default authSlice.reducer;
