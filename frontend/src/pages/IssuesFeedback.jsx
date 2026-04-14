import React, { useState } from "react";
import { User, Mail, Phone, MessageSquare, Send, CheckCircle } from "lucide-react";
import { issueService } from "../services/issueService";

const IssuesFeedback = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile_number: "",
    issue_subject: "",
    issue: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await issueService.createIssue(formData);
      setSuccess(true);

      setFormData({
        name: "",
        email: "",
        mobile_number: "",
        issue_subject: "",
        issue: "",
      });

    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit issue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              {success ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <MessageSquare className="w-8 h-8 text-blue-600" />
              )}
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Issues & Feedback
            </h2>

            <p className="text-sm text-gray-600">
              Share your concern or feedback with our IT team
            </p>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-md p-4 text-sm text-center">
              Your feedback/concern has been submitted to our IT team.  
              We will call you shortly.
            </div>
          )}

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>

                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />

                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>

                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />

                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number
                </label>

                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />

                  <input
                    type="tel"
                    name="mobile_number"
                    value={formData.mobile_number}
                    onChange={handleChange}
                    placeholder="9876543210"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Subject *
                </label>

                <input
                  type="text"
                  name="issue_subject"
                  required
                  value={formData.issue_subject}
                  onChange={handleChange}
                  placeholder="Login issue / System error"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe Your Issue *
                </label>

                <textarea
                  name="issue"
                  rows="4"
                  required
                  value={formData.issue}
                  onChange={handleChange}
                  placeholder="Explain your problem..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
              >
                <Send size={18} />
                {loading ? "Submitting..." : "Submit Feedback"}
              </button>

            </form>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs text-blue-700 text-center">
            Our IT team will review your issue and contact you if required.
          </p>
        </div>

      </div>
    </div>
  );
};

export default IssuesFeedback;