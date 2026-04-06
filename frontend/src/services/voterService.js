import api from '../config/api';
import { setToken, setUser } from '../store/slices/voterSessionSlice';

export const voterService = {
  getAllVoters: async (ward_id, election_id) => {
    const response = await api.post('/voters/all-voters', {
      ward_id,
      election_id
    });
    return response.data;
  },

  getVoterById: async (id) => {
    const response = await api.post('/voters/get-voter', { id });
    return response.data;
  },

  deleteVoter: async (id) => {
    const response = await api.delete('/voters/delete-voter', {
      data: { id } 
    });
    return response.data;
  },

  loginVoter: async (login_id) => {
    const response = await api.post('/voters/voter-login', { login_id });
    return response.data;
  },

  // New: verify OTP
  verifyVoterOTP: async (login_id, otp, dispatch) => {
    const response = await api.post('/voters/voter-verify-otp', { login_id, otp });
    const { voter, token } = response.data;
    dispatch(setUser(voter));
    dispatch(setToken(token));
    return voter;
  },

  getAllVotersForAdmin: async (ward_id, election_id) => {
    const response = await api.post('/voters/all-voters-admin', {
      ward_id,
      election_id,
    });
    return response.data;
  },
};