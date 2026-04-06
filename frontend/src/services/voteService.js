import api from '../config/api';

export const voteService = {

  // Cast Vote
  castVote: async (candidate_id) => {
    const response = await api.post('/votes/cast', {
      candidate_id
    });

    return response.data;
  },

  // Get Voter Voting Status
  getVoterStatus: async () => {
    const response = await api.post('/votes/status');

    return response.data;
  },

  // Get Candidates Available for Voter
  getCandidatesForVoter: async () => {
    try {
      const voterCheck = await api.post('/votes/status'); // Your API call
      if (voterCheck.hasVoted) {
        throw new Error('VOTER_ALREADY_VOTED');
      }
      
      const response = await api.post('/votes/candidates');
      return response.data;
    } catch (error) {
      if (error.message === 'VOTER_ALREADY_VOTED') {
        throw { hasVoted: true, message: 'You have already cast your vote' };
      }
      throw error;
    }
  },

  // Get Election Results
  getElectionResults: async (election_id, ward_id = null) => {
    const response = await api.post('/votes/results', {
      election_id,
      ward_id
    });

    return response.data;
  },

  // Verify Vote on Blockchain
  verifyVoteOnBlockchain: async (blockchain_hash) => {
    const response = await api.post('/votes/verify', {
      blockchain_hash
    });

    return response.data;
  },

  // Get Ward Statistics (Admin)
  getWardStatistics: async (ward_id) => {
    const response = await api.post('/votes/ward-stats', {
      ward_id
    });

    return response.data;
  },

  getElectionResultsForAdmin: async (election_id, ward_id, user_id) => {
    const response = await api.post('/votes/results-admin', {
      election_id,
      ward_id,
      user_id
    });
    return response.data;
  },

};