import api from "../config/api";

/**
 * Issue / Feedback Services
 */
export const issueService = {
  
  /**
   * Create new feedback / issue
   */
  createIssue: async (data) => {
    const response = await api.post("/issues/create", data);
    return response.data;
  },

  /**
   * Get all issues (Admin only)
   */
  getAllIssues: async () => {
    const response = await api.get("/issues/all");
    return response.data;
  },

  /**
   * Get issues by seen status (Admin)
   * issue_seen: true / false
   */
  getIssuesByStatus: async (issue_seen) => {
    const response = await api.post("/issues/status", {
      issue_seen,
    });
    return response.data;
  },

  /**
   * Update issue seen status
   */
  updateIssueSeen: async (id, issue_seen) => {
    const response = await api.put("/issues/update-seen", {
      id,
      issue_seen,
    });
    return response.data;
  },

  updateIssue: async (id, data) => {
    const response = await api.put("/issues/update", {
        id,
        ...data
    });
    return response.data;
    }
};