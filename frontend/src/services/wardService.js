import api from '../config/api';

export const wardService = {
  // Get all wards (Admin)
  getAllWards: async () => {
    const response = await api.get('/wards/all-ward');
    return response.data;
  },

  // Create ward (Admin)
  createWard: async (wardData) => {
    const response = await api.post('/wards/create-ward', wardData);
    return response.data;
  },

  // Get ward by ID (Admin)
  getWardById: async (id) => {
    const response = await api.post('/wards/get-ward', { id });
    return response.data;
  },

  // Update ward (Admin)
  updateWard: async (wardData) => {
    const response = await api.put('/wards/update-ward', wardData);
    return response.data;
  },

  // Delete ward (Admin)
  deleteWard: async (id) => {
    const response = await api.delete('/wards/delete-ward', {
      data: { id } // Axios requires "data" for DELETE body
    });
    return response.data;
  },

  uploadVoterList: async (ward_id, election_id, file) => {
    const formData = new FormData();
    formData.append('ward_id', ward_id);
    formData.append('election_id', election_id);
    formData.append('file', file); // MUST match backend upload.single('file')

    const response = await api.post('/wards/upload-voter-list', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  },

  getAllWardsForAdmin: async () => {
    const response = await api.post('/wards/all-ward-admin');
    return response.data;
  },

  getUploadHistory: async (wardId, electionId) => {
    const response = await api.post('/wards/all-upload-history', {
      ward_id: wardId,
      election_id: electionId
    });
    return response.data;
  },

  getUploadHistoryForElection: async (election_id) => {
    const response = await api.post('/wards/upload-history', election_id);
    return response.data
  }

};
