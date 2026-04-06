// ✅ Complete ProtectedVotingRoute
import { useEffect, useState } from 'react';
import { voteService } from '../../services/voteService';
import AlreadyVotedScreen from './AlreadyVotedScreen'; // Create this file
import VoterDashboard from './VoterDashboard';

const ProtectedVotingRoute = () => {
  const [status, setStatus] = useState('loading'); // 'loading' | 'canVote' | 'voted'
  const [voter, setVoter] = useState(null);

  useEffect(() => {
    checkVoterStatus();
  }, []);

  const checkVoterStatus = async () => {
    try {
      const voterData = await voteService.getVoterStatus();
      setVoter(voterData.voter);
      
      if (voterData.hasVoted) {
        setStatus('voted');
      } else {
        setStatus('canVote');
      }
    } catch (error) {
      console.error('Failed to check voter status:', error);
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-500">Checking eligibility...</p>
        </div>
      </div>
    );
  }

  if (status === 'voted') {
    return <AlreadyVotedScreen voter={voter} />;
  }

  return <VoterDashboard voter={voter} />;
};

export default ProtectedVotingRoute;