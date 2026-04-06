import React, { useState } from "react";
import { Lock, Eye, EyeOff, Shield, KeyRound } from "lucide-react";
import { useSelector } from "react-redux";
import { adminService } from "../../services/adminService";

const AdminChangePassword = () => {
  const [step, setStep]       = useState("password"); // password | otp
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);

  const [show, setShow] = useState({ new: false, confirm: false });

  const [formData, setFormData] = useState({
    newPassword:     "",
    confirmPassword: "",
    otp:             "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  /* ── Password submit ── */
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.newPassword !== formData.confirmPassword)
      return setError("Passwords do not match");

    if (formData.newPassword.length < 8)
      return setError("Password must be at least 8 characters");

    try {
      setLoading(true);
      await adminService.changePassword(formData.newPassword);
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  /* ── OTP verify ── */
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      await adminService.verifyChangePasswordOTP(formData.otp);
      setSuccess(true);
      setStep("password");
      setFormData({ newPassword: "", confirmPassword: "", otp: "" });
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8"
      style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}
    >
      <div className="w-full max-w-md">

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">

          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-full mb-3 sm:mb-4">
              {step === "password"
                ? <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                : <KeyRound className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              }
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1 sm:mb-2">
              {step === "password" ? "Change Password" : "Verify OTP"}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              {step === "password"
                ? "Update your admin account password"
                : "Enter the 6-digit OTP sent to your email"}
            </p>
          </div>

          {success && (
            <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <Shield size={15} className="flex-shrink-0" />
              Password changed successfully!
            </div>
          )}

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {step === "password" && (
            <form className="space-y-4 sm:space-y-5" onSubmit={handlePasswordSubmit}>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={show.new ? "text" : "password"}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    required
                    className="block w-full pr-10 px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow({ ...show, new: !show.new })}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {show.new ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={show.confirm ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="block w-full pr-10 px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    placeholder="Re-enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow({ ...show, confirm: !show.confirm })}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {show.confirm ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {formData.newPassword.length > 0 && (
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        formData.newPassword.length >= i * 3
                          ? formData.newPassword.length >= 12
                            ? "bg-emerald-400"
                            : formData.newPassword.length >= 8
                            ? "bg-blue-400"
                            : "bg-orange-400"
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formData.newPassword.length < 8 ? "Weak" : formData.newPassword.length < 12 ? "Good" : "Strong"}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Sending OTP..." : "Update Password"}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOTP} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  OTP Code
                </label>
                <input
                  type="text"
                  name="otp"
                  maxLength={6}
                  value={formData.otp}
                  onChange={handleChange}
                  className="block w-full text-center tracking-[0.5em] text-xl py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="——————"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
                <p className="text-xs text-gray-400 mt-1.5 text-center">
                  Check your email for the 6-digit code
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                onClick={() => { setStep("password"); setError(""); }}
                className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors py-1"
              >
                ← Back to password
              </button>
            </form>
          )}
        </div>

        <div className="mt-4 sm:mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-0.5">
                Password Security
              </h4>
              <p className="text-xs text-blue-700">
                Use at least 8 characters including numbers and symbols.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminChangePassword;