import api from '../config/api';

export const electionService = {
  // Get all elections (Admin)
  getAllElections: async () => {
    const response = await api.get('/elections/all');
    return response.data;
  },

  // Create election (Admin)
  createElection: async (electionData) => {
    const response = await api.post('/elections/create', electionData);
    return response.data;
  },

  // Get election by ID (Admin)
  getElectionById: async (id) => {
    const response = await api.post('/elections/get', { id });
    return response.data;
  },

  // Update election (Admin)
  updateElection: async (electionData) => {
    const response = await api.put('/elections/update', electionData);
    return response.data;
  },

  // Delete election (Admin)
  deleteElection: async (id) => {
    const response = await api.delete('/elections/delete', {
      data: { id }  // Axios requires "data" for DELETE body
    });
    return response.data;
  },

  // Get active/scheduled elections (Voters)
  getActiveElections: async () => {
    const response = await api.get('/elections/active');
    return response.data;
  },

  getCompletedElections: async () => {
    const response = await api.get('/elections/completed');
    return response.data;
  },

  // Get election statistics (Admin)
  getElectionStatistics: async (id) => {
    const response = await api.post('/elections/statistics', { id });
    return response.data;
  },

  getAllElectionsForAdmin: async () => {
    const response = await api.post('/elections/all-admin');
    return response.data;
  },

  getActiveElectionsForAdmin: async () => {
    const response = await api.post('/elections/active-admin');
    return response.data;
  },

  getCompletedElectionsForAdmin: async () => {
    const response = await api.post('/elections/completed-admin');
    return response.data;
  },

};
