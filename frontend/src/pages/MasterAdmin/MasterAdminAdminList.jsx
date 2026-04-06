import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Select, message, Spin } from "antd";
import { Plus, Edit, Trash2, Search, Mail, Shield } from "lucide-react";
import { adminService } from "../../services/adminService";
import dayjs from "dayjs";

const { Option } = Select;

/* ─── Admin Card (mobile) ────────────────────────────────────────────────── */
const AdminCard = ({ admin, index, onEdit, onDelete }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
    <div className="flex items-center gap-3">
      {/* Avatar */}
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold text-base flex-shrink-0">
        {admin.name?.[0]?.toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-bold text-slate-800 text-sm truncate">{admin.name}</p>
          <span className="text-[10px] text-slate-300 font-mono flex-shrink-0">#{index + 1}</span>
        </div>
        <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
          <Mail size={10} className="flex-shrink-0 text-slate-400" /> {admin.email}
        </p>
        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 capitalize">
          <Shield size={10} className="flex-shrink-0 text-slate-400" /> {admin.role}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(admin)}
          className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Edit size={15} />
        </button>
        <button
          onClick={() => onDelete(admin.id)}
          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  </div>
);

const fmt = (date) => date ? dayjs(date).format("DD MMM YYYY, hh:mm A") : "—";

/* ─── Main Component ─────────────────────────────────────────────────────── */
const MasterAdminAdminList = () => {
  const [admins, setAdmins]           = useState([]);
  const [loading, setLoading]         = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [searchTerm, setSearchTerm]   = useState("");
  const [form] = Form.useForm();

  /* ── fetch ── */
  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllAdmins();
      setAdmins(data);
    } catch { message.error("Failed to fetch admins"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAdmins(); }, []);

  /* ── modal ── */
  const showModal = () => {
    setIsModalOpen(true); setEditingAdmin(null); form.resetFields();
  };

  const showEditModal = (admin) => {
    setEditingAdmin(admin); setIsModalOpen(true); form.setFieldsValue(admin);
  };

  const handleCancel = () => {
    setIsModalOpen(false); setEditingAdmin(null); form.resetFields();
  };

  /* ── submit ── */
  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      if (editingAdmin) {
        await adminService.updateAdmin(editingAdmin.id, { ...values, id: editingAdmin.id });
        message.success("Admin updated successfully");
      } else {
        await adminService.createAdmin(values);
        message.success("Admin added successfully");
      }
      handleCancel(); fetchAdmins();
    } catch { message.error("Something went wrong"); }
    finally { setLoading(false); }
  };

  /* ── delete ── */
  const handleDelete = (id) => {
    Modal.confirm({
      title: "Delete Admin",
      content: "Are you sure you want to delete this admin?",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await adminService.deleteAdmin(id);
          message.success("Admin deleted successfully");
        } catch {  }
        finally { fetchAdmins(); }
      },
    });
  };

  const filteredAdmins = admins.filter(
    (admin) =>
      admin.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ─── RENDER ─────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4 sm:space-y-5" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

      {/* ── Header ── */}
      <div className="bg-white px-4 sm:px-6 py-4 sm:py-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-xl font-bold text-slate-800 tracking-tight">
            Admin Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage all system admins
          </p>
        </div>
        <button
          onClick={showModal}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm rounded-lg font-medium transition-colors flex-shrink-0"
        >
          <Plus size={14} /> <span>Add Admin</span>
        </button>
      </div>

      {/* ── Search ── */}
      <div className="bg-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            className="pl-9 w-full border border-slate-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Search admins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex justify-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <Spin />
        </div>
      ) : (
        <>
          {/* Mobile — cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {filteredAdmins.length === 0
              ? <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-14 text-center text-slate-400 text-sm">No admins found</div>
              : filteredAdmins.map((admin, index) => (
                  <AdminCard
                    key={admin.id}
                    admin={admin}
                    index={index}
                    onEdit={showEditModal}
                    onDelete={handleDelete}
                  />
                ))
            }
          </div>

          {/* Desktop — table */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                    <th className="px-5 py-3 text-left font-semibold">S.No.</th>
                    <th className="px-5 py-3 text-left font-semibold">Name</th>
                    <th className="px-5 py-3 text-left font-semibold">Email</th>
                    <th className="px-5 py-3 text-left font-semibold">Role</th>
                    <th className="px-5 py-3 text-left font-semibold">Updated by</th>
                    <th className="px-5 py-3 text-left font-semibold">Updated at</th>
                    <th className="px-5 py-3 text-left font-semibold">Role</th>
                    <th className="px-5 py-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAdmins.length === 0 && (
                    <tr><td colSpan="5" className="py-14 text-center text-slate-400 text-sm">No admins found</td></tr>
                  )}
                  {filteredAdmins.map((admin, index) => (
                    <tr key={admin.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-slate-400 text-xs">{index + 1}</td>
                      <td className="px-5 py-3 font-semibold text-slate-800">{admin.name}</td>
                      <td className="px-5 py-3 text-slate-600">{admin.email}</td>
                      <td className="px-5 py-3 text-slate-600 capitalize">{admin.role}</td>
                      <td className="px-5 py-3 text-slate-600 capitalize">{admin.updated_by}</td>
                      <td className="px-5 py-3 text-slate-600 capitalize">{fmt(admin.uploaded_at)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => showEditModal(admin)} className="text-blue-500 hover:text-blue-700 transition-colors"><Edit size={16} /></button>
                          <button onClick={() => handleDelete(admin.id)} className="text-red-500 hover:text-red-700 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredAdmins.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-50 text-xs text-slate-400 text-right">
                  {filteredAdmins.length} admin{filteredAdmins.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Modal ── */}
      <Modal
        title={
          <span className="font-semibold text-slate-800">
            {editingAdmin ? "Edit Admin" : "Add Admin"}
          </span>
        }
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        width="min(480px, 95vw)"
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-2">
          <Form.Item name="name" label="Admin Name" rules={[{ required: true }]}>
            <Input size="large" placeholder="Enter admin name" />
          </Form.Item>

          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
            <Input size="large" placeholder="Enter email address" />
          </Form.Item>

          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select size="large">
              <Option value="admin">Admin</Option>
            </Select>
          </Form.Item>

          {!editingAdmin && (
            <Form.Item name="password" label="Password" rules={[{ required: true, message: "Password is required" }]}>
              <Input.Password size="large" placeholder="Enter password" />
            </Form.Item>
          )}

          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {editingAdmin ? "Update Admin" : "Add Admin"}
            </button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default MasterAdminAdminList;