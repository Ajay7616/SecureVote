import React from 'react';
import { Shield, CheckCircle, User } from 'lucide-react';

const AlreadyVotedScreen = ({ voter }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 px-4 py-8">
    <div className="max-w-sm w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-12 h-12 text-white" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You for Voting!</h1>
      <p className="text-gray-600 mb-6">Your vote has been securely recorded.</p>
      <div className="bg-emerald-50 rounded-2xl p-6 mb-6 border border-emerald-200">
        <p className="text-sm font-semibold text-gray-900">{voter?.name}</p>
        <p className="text-xs text-emerald-700 mt-1">✓ Vote Completed</p>
      </div>
      <button 
        onClick={() => window.close()}
        className="w-full bg-emerald-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-emerald-700"
      >
        Close Window
      </button>
    </div>
  </div>
);

export default AlreadyVotedScreen;