import api from '../config/api';

export const candidateService = {
  getAllCandidates: async () => {
    const response = await api.get('/candidates/all-candidates');
    return response.data;
  },

  createCandidate: async (candidateData) => {
    const response = await api.post(
        '/candidates/create-candidate',
        candidateData,
        {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
        }
    );
    return response.data;
    },

  getCandidateById: async (id) => {
    const response = await api.post('/candidates/get-candidate', { id });
    return response.data;
  },

  updateCandidate: async (candidateData) => {
    const response = await api.put(
      '/candidates/update-candidate',
      candidateData,
      {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    }
    );
    return response.data;
  },

  deleteCandidate: async (id) => {
    const response = await api.delete('/candidates/delete-candidate', {
      data: { id }
    });
    return response.data;
  },

  getCandidateByElectionAndWard: async (election_id, ward_id) => {
    const response = await api.post('/candidates/candidates-by-election-and-ward', {election_id, ward_id});
    return response.data;
  },

  getAdminCandidateByElectionAndWard: async (election_id, ward_id) => {
    const response = await api.post('/candidates/admin-candidates-by-election-and-ward', {election_id, ward_id});
    return response.data;
  },

  getAllCandidatesForAdmin: async () => {
    const response = await api.post('/candidates/all-candidates-admin');
    return response.data;
  },

  getAdminCandidateByElectionAndWardForAdmin: async (election_id, ward_id) => {
    const response = await api.post('/candidates/admin-candidates-by-election-and-ward-for-admin', {election_id, ward_id});
    return response.data;
  },
};