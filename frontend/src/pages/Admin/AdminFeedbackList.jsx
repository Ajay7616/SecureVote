import React, { useEffect, useState } from "react";
import { Modal, Select, Spin, message } from "antd";
import { Search, Eye, Mail, Phone, MessageSquare, CheckCircle2, Filter } from "lucide-react";
import { issueService } from "../../services/issueService";
import dayjs from 'dayjs';

const { Option } = Select;

/* ─── Status Badge ───────────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const map = {
    open:        "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    in_progress: "bg-orange-50 text-orange-600 ring-1 ring-orange-200",
    resolved:    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    closed:      "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  };
  const labels = { open: "Open", in_progress: "In Progress", resolved: "Resolved", closed: "Closed" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || map.closed}`}>
      {labels[status] || status}
    </span>
  );
};

const fmt = (date) => date ? dayjs(date).format("DD MMM YYYY, hh:mm A") : "—";

/* ─── Issue Card (mobile) ────────────────────────────────────────────────── */
const IssueCard = ({ issue, index, onMarkSeen, onStatusChange }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
    {/* Top row */}
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-slate-300 font-mono">#{index + 1}</span>
          {issue.issue_seen
            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-full ring-1 ring-emerald-200"><CheckCircle2 size={9} /> Seen</span>
            : <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-600 rounded-full ring-1 ring-blue-200">New</span>
          }
        </div>
        <p className="font-bold text-slate-800 text-sm leading-snug">{issue.name}</p>
      </div>
      {/* Mark seen button */}
      {!issue.issue_seen && (
        <button
          onClick={() => onMarkSeen(issue)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg ring-1 ring-blue-200 transition-colors flex-shrink-0"
        >
          <Eye size={12} /> Mark Seen
        </button>
      )}
    </div>

    {/* Contact info */}
    <div className="space-y-1 mb-3">
      <p className="text-xs text-slate-500 flex items-center gap-1.5">
        <Mail size={11} className="text-slate-400 flex-shrink-0" />
        <span className="truncate">{issue.email}</span>
      </p>
      {issue.mobile_number && (
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <Phone size={11} className="text-slate-400 flex-shrink-0" />
          {issue.mobile_number}
        </p>
      )}
    </div>

    {/* Subject + issue */}
    {issue.issue_subject && (
      <p className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
        <MessageSquare size={11} className="text-slate-400" /> {issue.issue_subject}
      </p>
    )}
    {issue.issue && (
      <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 leading-relaxed mb-3 line-clamp-3">
        {issue.issue}
      </p>
    )}

    {/* Status selector */}
    <div className="flex items-center justify-between gap-3">
      <StatusBadge status={issue.status} />
      <Select
        size="small"
        value={issue.status}
        onChange={(value) => onStatusChange(issue.id, value)}
        className="w-36"
        onClick={(e) => e.stopPropagation()}
      >
        <Option value="open">Open</Option>
        <Option value="in_progress">In Progress</Option>
        <Option value="resolved">Resolved</Option>
        <Option value="closed">Closed</Option>
      </Select>
    </div>
  </div>
);

/* ─── Main Component ─────────────────────────────────────────────────────── */
const AdminFeedbackList = () => {
  const [issues, setIssues]           = useState([]);
  const [loading, setLoading]         = useState(false);
  const [searchTerm, setSearchTerm]   = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  /* ── fetch ── */
  const fetchIssues = async () => {
    try {
      setLoading(true);
      const res = await issueService.getAllIssues();
      setIssues(res.data);
    } catch { message.error("Failed to fetch issues"); }
    finally { setLoading(false); }
  };

  const fetchByStatus = async (status) => {
    try {
      setLoading(true);
      if (status === "all") { fetchIssues(); return; }
      const res = await issueService.getIssuesByStatus(status === "seen");
      setIssues(res.data);
    } catch { message.error("Failed to filter issues"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchIssues(); }, []);

  /* ── mark seen ── */
  const markSeen = async (issue) => {
    Modal.confirm({
      title: "Mark Issue as Seen",
      content: "Are you sure you want to mark this issue as seen?",
      okText: "Yes",
      onOk: async () => {
        try {
          await issueService.updateIssue(issue.id, { issue_seen: true });
          message.success("Issue marked as seen");
          fetchIssues();
        } catch { message.error("Failed to update issue"); }
      },
    });
  };

  /* ── status change ── */
  const handleStatusChange = async (id, value) => {
    try {
      await issueService.updateIssue(id, { status: value });
      message.success("Issue status updated");
      fetchIssues();
    } catch { message.error("Failed to update status"); }
  };

  /* ── filtered ── */
  const filteredIssues = issues.filter(
    (item) =>
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.issue_subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ─── RENDER ─────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4 sm:space-y-5" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

      {/* ── Header ── */}
      <div className="bg-white px-4 sm:px-6 py-4 sm:py-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-xl font-bold text-slate-800 tracking-tight">
            Issues & Feedback
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            User reported issues and feedback
          </p>
        </div>
        <Select
          value={filterStatus}
          onChange={(value) => { setFilterStatus(value); fetchByStatus(value); }}
          className="w-32 sm:w-40"
          suffixIcon={<Filter size={13} className="text-slate-400" />}
        >
          <Option value="all">All</Option>
          <Option value="seen">Seen</Option>
          <Option value="unseen">Unseen</Option>
        </Select>
      </div>

      {/* ── Search ── */}
      <div className="bg-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            className="pl-9 w-full border border-slate-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Search issues..."
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
            {filteredIssues.length === 0
              ? <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-14 text-center text-slate-400 text-sm">No issues found</div>
              : filteredIssues.map((issue, index) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    index={index}
                    onMarkSeen={markSeen}
                    onStatusChange={handleStatusChange}
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
                    <th className="px-5 py-3 text-left font-semibold">Mobile</th>
                    <th className="px-5 py-3 text-left font-semibold">Subject</th>
                    <th className="px-5 py-3 text-left font-semibold">Issue</th>
                    <th className="px-5 py-3 text-left font-semibold">Status</th>
                    <th className="px-5 py-3 text-left font-semibold">Updated By</th>
                    <th className="px-5 py-3 text-left font-semibold">Updated At</th>
                    <th className="px-5 py-3 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredIssues.length === 0 && (
                    <tr><td colSpan="8" className="py-14 text-center text-slate-400 text-sm">No issues found</td></tr>
                  )}
                  {filteredIssues.map((issue, index) => (
                    <tr key={issue.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-slate-400 text-xs">{index + 1}</td>
                      <td className="px-5 py-3 font-semibold text-slate-800">{issue.name}</td>
                      <td className="px-5 py-3 text-slate-600">{issue.email}</td>
                      <td className="px-5 py-3 text-slate-600">{issue.mobile_number}</td>
                      <td className="px-5 py-3 text-slate-600">{issue.issue_subject}</td>
                      <td className="px-5 py-3 text-slate-600 max-w-xs truncate">{issue.issue}</td>
                      <td className="px-5 py-3">
                        <Select
                          size="small"
                          value={issue.status}
                          onChange={(value) => handleStatusChange(issue.id, value)}
                          className="w-32"
                        >
                          <Option value="open">Open</Option>
                          <Option value="in_progress">In Progress</Option>
                          <Option value="resolved">Resolved</Option>
                          <Option value="closed">Closed</Option>
                        </Select>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{issue.updated_by_name}</td>
                      <td className="px-5 py-3 text-slate-600">{fmt(issue.updated_at)}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-center">
                          {!issue.issue_seen ? (
                            <button onClick={() => markSeen(issue)} className="text-blue-500 hover:text-blue-700">
                              <Eye size={17} />
                            </button>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-md">Seen</span>
                          )}
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
    </div>
  );
};

export default AdminFeedbackList;