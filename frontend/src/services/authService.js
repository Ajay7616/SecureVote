import api from '../config/api';
import { setToken, setUser } from '../store/slices/authSlice';


export const authService = {
  // Admin login
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  // Voter login - Verify OTP
   employeeVerifyOTP: async (email, otp, dispatch) => {
    const response = await api.post('/auth/verify-otp', { email, otp });
    const { user, token } = response.data;
    dispatch(setToken(token))
    dispatch(setUser(user));
    // dispatch(setToken(response.token));
    return user;
  },


  logout: () => {

  },

  // Get current user
  getCurrentUser: () => {
    // const user = localStorage.getItem('user');
    // return user ? JSON.parse(user) : null;
  },

  // Check if authenticated
  isAuthenticated: () => {
    // return !!localStorage.getItem('token');
  }
};