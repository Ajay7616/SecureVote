import api from "../config/api";

/**
 * Admin Services (Super Admin only unless stated)
 */
export const adminService = {
  createAdmin: async (data) => {
    const response = await api.post("/auth/admin", data);
    return response.data;
  },

  updateAdmin: async (id, data) => {
    const response = await api.put(`/auth/admin`, data);
    return response.data;
  },

  deleteAdmin: async (id) => {
    const response = await api.delete("/auth/admin", {
      data: { id },
    });

    if (!response.ok) throw new Error("Failed to delete admin");
    return response.json();
  },

  getAllAdmins: async () => {
    const response = await api.get("/auth/get-admins");
    return response.data;
  },

  changePassword: async (newPassword) => {
    const response = await api.post("/auth/change-password", {
      newPassword,
    });
    return response.data;
  },

  /**
   * Step 2: Verify OTP and complete password change
   */
  verifyChangePasswordOTP: async (otp) => {
    const response = await api.post("/auth/verify-change-password", {
      otp,
    });
    return response.data;
  },
};
