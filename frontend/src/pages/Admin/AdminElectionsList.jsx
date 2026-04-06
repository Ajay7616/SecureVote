import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Select, message, Spin } from "antd";
import { Plus, Edit, Trash2, Search, Calendar, Clock, User, Users } from "lucide-react";
import { History, FileSpreadsheet, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";

import {
  setElections, addElection, updateElection,
  deleteElection, setLoading, setError,
} from "../../store/slices/electionSlice";

import { electionService } from "../../services/electionService";
import { adminService }    from "../../services/adminService";
import { wardService } from "../../services/wardService";

const { Option } = Select;

/* ─── Badge ──────────────────────────────────────────────────────────────── */
const Badge = ({ children, status }) => {
  const map = {
    Active:    "bg-orange-50 text-orange-600 ring-orange-200",
    Scheduled: "bg-blue-50 text-blue-700 ring-blue-200",
    Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Cancelled: "bg-slate-100 text-slate-500 ring-slate-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${map[status] || map.Cancelled}`}>
      {children}
    </span>
  );
};

const AdminPill = ({ name }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 ring-1 ring-violet-200">
    {name}
  </span>
);

const fmt = (date) => date ? dayjs(date).format("DD MMM YYYY, hh:mm A") : "—";

const successRate = (row) => {
  if (!row.total_voters) return 0;
  return Math.round((row.successful_imports / row.total_voters) * 100);
};

const uploadStatusColor = (status) => {
  switch (status) {
    case "Completed": return "bg-emerald-50 text-emerald-600";
    case "Processing": return "bg-blue-50 text-blue-600";
    case "Failed": return "bg-red-50 text-red-500";
    default: return "bg-slate-100 text-slate-500";
  }
};

const StatCard = ({ label, value, color = "slate" }) => {
  const colors = {
    slate: "text-slate-400",
    emerald: "text-emerald-500",
    red: "text-red-500",
    violet: "text-violet-500",
  };

  return (
    <div className="bg-white rounded-lg px-3 py-2.5 border border-slate-100 shadow-sm">
      <p className={`text-[10px] font-semibold mb-1 uppercase ${colors[color]}`}>
        {label}
      </p>
      <p className="text-sm font-bold text-slate-700 truncate">{value}</p>
    </div>
  );
};

/* ─── Election Card (mobile) ─────────────────────────────────────────────── */
const ElectionCard = ({ election, index, onEdit, onDelete }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
    {/* Top */}
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-slate-300 font-mono">#{index + 1}</span>
          <Badge status={election.status}>{election.status}</Badge>
        </div>
        <p className="font-bold text-slate-800 text-sm leading-snug">{election.title}</p>
        {election.description && (
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{election.description}</p>
        )}
      </div>
      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(election)}
          className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Edit size={15} />
        </button>
        <button
          onClick={() => onDelete(election.id)}
          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>

    {/* Date + time row */}
    <div className="grid grid-cols-3 gap-2 mb-3">
      <div className="bg-slate-50 rounded-xl px-3 py-2 text-center">
        <p className="text-xs font-bold text-slate-700">
          {election.election_date ? dayjs(election.election_date).format("DD MMM YYYY") : "—"}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-center gap-0.5">
          <Calendar size={9} /> Date
        </p>
      </div>
      <div className="bg-slate-50 rounded-xl px-3 py-2 text-center">
        <p className="text-xs font-bold text-slate-700">
          {election.start_time ? dayjs(election.start_time).format("hh:mm A") : "—"}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-center gap-0.5">
          <Clock size={9} /> Start
        </p>
      </div>
      <div className="bg-slate-50 rounded-xl px-3 py-2 text-center">
        <p className="text-xs font-bold text-slate-700">
          {election.end_time ? dayjs(election.end_time).format("hh:mm A") : "—"}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-center gap-0.5">
          <Clock size={9} /> End
        </p>
      </div>
    </div>

    {/* Created by */}
    {election.created_by_name && (
      <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
        <User size={10} /> Created by <span className="text-slate-600 font-medium">{election.created_by_name}</span>
      </p>
    )}

    {/* Assignees */}
    {election.assigned_admins?.length > 0 && (
      <div className="flex flex-wrap gap-1">
        {election.assigned_admins.map(a => <AdminPill key={a.id} name={a.name} />)}
      </div>
    )}
  </div>
);

/* ─── Main Component ─────────────────────────────────────────────────────── */
const AdminElectionsList = () => {
  const dispatch = useDispatch();
  const { elections, loading } = useSelector((state) => state.elections);

  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [editingElection, setEditingElection] = useState(null);
  const [searchTerm, setSearchTerm]       = useState("");
  const [admins, setAdmins]               = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [form] = Form.useForm();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedElection, setSelectedElection] = useState(null);
  const [expanded, setExpanded] = useState(null);

  /* ── fetch ── */
  useEffect(() => { fetchElections(); }, []);

  const fetchElections = async () => {
    try {
      dispatch(setLoading(true));
      const response = await electionService.getActiveElectionsForAdmin();
      dispatch(setElections(response.data));
    } catch (error) {
      dispatch(setError(error.message));
      message.error("Failed to fetch elections");
    } finally {
      dispatch(setLoading(false));
    }
  };

  const fetchHistory = async (election) => {
    try {
      setHistoryLoading(true);
      setSelectedElection(election);

      const res = await wardService.getUploadHistoryForElection({
        election_id: election.id,
      });

      setHistoryData(res.data || []);
      setHistoryOpen(true);
    } catch (err) {
      message.error("Failed to fetch upload history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      setAdminsLoading(true);
      const data = await adminService.getAllAdmins();
      setAdmins(data);
    } catch { message.error("Failed to fetch admins"); }
    finally { setAdminsLoading(false); }
  };

  /* ── modal ── */
  const showAddModal = () => {
    setEditingElection(null); form.resetFields();
    setIsModalOpen(true); fetchAdmins();
  };

  const showEditModal = (election) => {
    setEditingElection(election);
    form.setFieldsValue({
      title:         election.title,
      description:   election.description,
      election_date: election.election_date ? dayjs(election.election_date).format("YYYY-MM-DD") : null,
      start_time:    election.start_time    ? dayjs(election.start_time).format("HH:mm")         : null,
      end_time:      election.end_time      ? dayjs(election.end_time).format("HH:mm")           : null,
      status:        election.status,
      admin_ids:     election.assigned_admins?.map(a => a.id) || [],
    });
    setIsModalOpen(true); fetchAdmins();
  };

  const handleCancel = () => {
    setIsModalOpen(false); setEditingElection(null); form.resetFields();
  };

  /* ── submit ── */
  const handleSubmit = async (values) => {
    try {
      dispatch(setLoading(true));
      if (editingElection) {
        const response = await electionService.updateElection({ id: editingElection.id, ...values });
        dispatch(updateElection(response.data));
        message.success("Election updated successfully");
      } else {
        const response = await electionService.createElection(values);
        dispatch(addElection(response.data));
        message.success("Election created successfully");
      }
      handleCancel();
    } catch (error) {
      // message.error(error.response?.data?.error);
    } finally {
      dispatch(setLoading(false));
      fetchElections();
    }
  };

  /* ── delete ── */
  const handleDelete = (id) => {
    Modal.confirm({
      title: "Delete Election",
      content: "Are you sure you want to delete this election?",
      okType: "danger",
      onOk: async () => {
        try {
          dispatch(setLoading(true));
          await electionService.deleteElection(id);
          dispatch(deleteElection(id));
          message.success("Election deleted");
        } catch (error) {
          message.error(error.response?.data?.error || "Delete failed");
        } finally {
          dispatch(setLoading(false));
          fetchElections();
        }
      },
    });
  };

  const filteredElections = elections.filter(e =>
    e.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ─── RENDER ─────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4 sm:space-y-5" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

      {/* ── Header ── */}
      <div className="bg-white px-4 sm:px-6 py-4 sm:py-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-xl font-bold text-slate-800 tracking-tight">
            Elections Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Create and manage elections
          </p>
        </div>
        <button
          onClick={showAddModal}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm rounded-lg font-medium transition-colors flex-shrink-0"
        >
          <Plus size={14} /> <span>Add Election</span>
        </button>
      </div>

      {/* ── Search ── */}
      <div className="bg-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            className="pl-9 w-full border border-slate-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Search elections..."
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
            {filteredElections.length === 0
              ? <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-14 text-center text-slate-400 text-sm">No elections found</div>
              : filteredElections.map((election, index) => (
                  <ElectionCard
                    key={election.id}
                    election={election}
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
                    <th className="px-5 py-3 text-center font-semibold">S.No.</th>
                    <th className="px-5 py-3 text-center font-semibold">Election Title</th>
                    <th className="px-5 py-3 text-center font-semibold">Date</th>
                    <th className="px-5 py-3 text-center font-semibold">Start</th>
                    <th className="px-5 py-3 text-center font-semibold">End</th>
                    <th className="px-5 py-3 text-center font-semibold">Created By</th>
                    <th className="px-5 py-3 text-center font-semibold">Assignees</th>
                    <th className="px-5 py-3 text-center font-semibold">Status</th>
                    <th className="px-5 py-3 text-center font-semibold">Updated By</th>
                    <th className="px-5 py-3 text-center font-semibold">Updated At</th>
                    <th className="px-5 py-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredElections.length === 0 && (
                    <tr><td colSpan="9" className="py-14 text-center text-slate-400 text-sm">No elections found</td></tr>
                  )}
                  {filteredElections.map((election, index) => (
                    <tr key={election.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-slate-400 text-xs text-center">{index + 1}</td>
                      <td className="px-5 py-3 font-semibold text-slate-800">{election.title}</td>
                      <td className="px-5 py-3 text-slate-600 text-center">{election.election_date ? dayjs(election.election_date).format("DD MMM YYYY") : "—"}</td>
                      <td className="px-5 py-3 text-slate-600 text-center">{election.start_time ? dayjs(election.start_time).format("hh:mm A") : "—"}</td>
                      <td className="px-5 py-3 text-slate-600 text-center">{election.end_time ? dayjs(election.end_time).format("hh:mm A") : "—"}</td>
                      <td className="px-5 py-3 text-slate-600 text-center">{election.created_by_name}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {election.assigned_admins?.length > 0
                            ? election.assigned_admins.map(a => <AdminPill key={a.id} name={a.name} />)
                            : <span className="text-slate-300 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center"><Badge status={election.status}>{election.status}</Badge></td>
                      <td className="px-5 py-3 text-slate-600 text-center">{election.updated_by_name}</td>
                      <td className="px-5 py-3 text-slate-600 text-center">{fmt(election.updated_at)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => showEditModal(election)} className="text-blue-500 hover:text-blue-700"><Edit size={16} /></button>
                          <button onClick={() => handleDelete(election.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                          <button
                            onClick={() => fetchHistory(election)}
                            className="text-violet-500 hover:text-violet-700"
                          >
                            <History size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Modal ── */}
      <Modal
        title={<span className="font-semibold text-slate-800">{editingElection ? "Edit Election" : "Add Election"}</span>}
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        width="min(520px, 95vw)"
      >
        <Form layout="vertical" form={form} onFinish={handleSubmit}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input />
          </Form.Item>

          <Form.Item name="election_date" label="Election Date" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>

          {/* Start + End time side by side */}
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="start_time" label="Start Time">
              <Input type="time" />
            </Form.Item>
            <Form.Item name="end_time" label="End Time">
              <Input type="time" />
            </Form.Item>
          </div>

          {/* <Form.Item name="status" label="Status">
            <Select>
              <Option value="Scheduled">Scheduled</Option>
              <Option value="Active">Active</Option>
              <Option value="Completed">Completed</Option>
              <Option value="Cancelled">Cancelled</Option>
            </Select>
          </Form.Item> */}

          <Form.Item name="admin_ids" label="Assign Admins">
            <Select mode="multiple" placeholder="Select admins to assign" loading={adminsLoading} optionFilterProp="label" allowClear>
              {admins.map(admin => (
                <Option key={admin.id} value={admin.id} label={admin.name}>
                  <div className="flex flex-col">
                    <span className="font-medium">{admin.name}</span>
                    <span className="text-xs text-slate-400">{admin.email}</span>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg w-full text-sm font-medium transition-colors">
            {editingElection ? "Update Election" : "Create Election"}
          </button>
        </Form>
      </Modal>
      <Modal
        title={
          <div className="flex items-center gap-2">
            <History size={16} className="text-violet-500" />
            <span className="font-semibold text-slate-800">
              Upload History — {selectedElection?.title || "Election"}
            </span>
          </div>
        }
        open={historyOpen}
        onCancel={() => {
          setHistoryOpen(false);
          setExpanded(null);
        }}
        footer={null}
        width="min(860px, 96vw)"
        destroyOnClose
      >
        {historyLoading ? (
          <div className="flex justify-center py-10">
            <Spin />
          </div>
        ) : historyData.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
            <FileSpreadsheet size={36} className="text-slate-200" />
            <p className="text-sm font-medium">No uploads for this election.</p>
          </div>
        ) : (
          <>
            {/* SCROLL CONTAINER */}
            <div className="mt-1 max-h-[60vh] overflow-y-auto">
              <div className="flex flex-col gap-2 pr-1">
                {historyData.map((row) => {
                  const rate = successRate(row);
                  const isExpanded = expanded === row.id;

                  return (
                    <div
                      id={`history-row-${row.id}`}
                      key={row.id}
                      className="border border-slate-100 rounded-xl overflow-hidden shadow-sm"
                    >
                      {/* HEADER */}
                      <div
                        className="flex items-center gap-3 px-4 py-3 bg-white cursor-pointer hover:bg-slate-50 transition-colors select-none"
                        onClick={() => {
                          const newExpanded = isExpanded ? null : row.id;
                          setExpanded(newExpanded);

                          // Auto scroll into view
                          if (!isExpanded) {
                            setTimeout(() => {
                              document
                                .getElementById(`history-row-${row.id}`)
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "nearest",
                                });
                            }, 120);
                          }
                        }}
                      >
                        {/* Icon */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                          <FileSpreadsheet size={15} className="text-violet-500" />
                        </div>

                        {/* File info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-700 truncate">
                            {row.file_name} - {row.ward_name} ({row.ward_number})
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {fmt(row.uploaded_at)}
                          </p>
                        </div>

                        {/* Pills */}
                        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                            Total{" "}
                            <span className="text-slate-700 font-bold ml-0.5">
                              {row.total_voters}
                            </span>
                          </span>
                          <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                            {row.successful_imports}
                          </span>
                          <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full font-medium">
                            {row.failed_imports}
                          </span>
                        </div>

                        {/* Status */}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${uploadStatusColor(
                            row.upload_status
                          )}`}
                        >
                          {row.upload_status}
                        </span>

                        {/* Chevron */}
                        <ChevronRight
                          size={14}
                          className={`text-slate-300 transition-transform duration-200 ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </div>

                      {/* EXPANDED SECTION */}
                      <div
                        className={`transition-all duration-300 overflow-hidden ${
                          isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                        }`}
                      >
                        <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
                          {/* Progress */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                              <span className="font-medium">
                                Import success rate
                              </span>
                              <span className="font-bold text-slate-700">
                                {rate}%
                              </span>
                            </div>
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  rate === 100
                                    ? "bg-emerald-400"
                                    : rate > 50
                                    ? "bg-blue-400"
                                    : "bg-orange-400"
                                }`}
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                          </div>

                          {/* Cards */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <StatCard label="Total in file" value={row.total_voters} />
                            <StatCard
                              label="Imported"
                              value={row.successful_imports}
                              color="emerald"
                            />
                            <StatCard
                              label="Failed"
                              value={row.failed_imports}
                              color="red"
                            />
                            <StatCard
                              label="Uploaded by"
                              value={row.uploaded_by_name}
                              color="violet"
                            />
                          </div>

                          {/* Processed */}
                          <div className="mt-3 bg-white rounded-lg px-3 py-2.5 border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-semibold text-slate-400 mb-1 uppercase">
                              Processed at
                            </p>
                            <p className="text-sm font-medium text-slate-600">
                              {fmt(row.processed_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* FOOTER */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>
                {historyData.length} upload
                {historyData.length !== 1 ? "s" : ""}
              </span>
              <span>
                {historyData.reduce(
                  (s, r) => s + (r.successful_imports ?? 0),
                  0
                )}{" "}
                voters imported
              </span>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default AdminElectionsList;