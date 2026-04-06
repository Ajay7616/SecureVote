import React, { useEffect, useState } from "react";
import { Vote, KeyRound, Shield } from "lucide-react";
import { voterService } from "../../services/voterService";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

const VoterLogin = () => {
  const [voterId, setVoterId] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1 = enter voterId, 2 = enter OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const voter = useSelector((state) => state.votes.voter);

  // ✅ Redirect if already logged in
  useEffect(() => {
    if (voter?.role === "voter") {
      navigate("/voter"); // already logged in, go to dashboard
    }
  }, [voter, navigate]);

  // STEP 1: Send voter ID
  const handleVoterLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await voterService.loginVoter(voterId);
      setStep(2); // move to OTP step
    } catch (err) {
      setError(err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await voterService.verifyVoterOTP(voterId, otp, dispatch);
      navigate("/voter");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Vote className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {step === 1 ? "Voter Login" : "Enter OTP"}
            </h2>
            <p className="text-sm text-gray-600">
              {step === 1
                ? "Enter your Voter ID to receive OTP"
                : "Enter the OTP sent to you"}
            </p>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleVoterLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voter ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={voterId}
                    onChange={(e) => setVoterId(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Enter your voter ID"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter OTP"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                Secure & Anonymous
              </h4>
              <p className="text-xs text-blue-700">
                Login requires OTP verification. Your vote remains anonymous.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoterLogin;