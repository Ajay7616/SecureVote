import React, { useEffect, useState } from 'react';
import { Calendar, Users, MapPin, CheckCircle, Plus, Clock } from 'lucide-react';
import { message } from 'antd';
import { electionService } from '../../services/electionService';
import { wardService } from '../../services/wardService';
import { adminService } from '../../services/adminService';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

/* ─── Shared ─────────────────────────────────────────────────────────────── */
const AdminPill = ({ name }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 ring-1 ring-violet-200">
    {name}
  </span>
);

const Th = ({ children }) => (
  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
    {children}
  </th>
);

const getStatusColor = (status) => {
  switch (status) {
    case 'Active':    return 'bg-green-100 text-green-700 border border-green-200';
    case 'Completed': return 'bg-gray-100 text-gray-600 border border-gray-200';
    case 'Scheduled': return 'bg-blue-100 text-blue-700 border border-blue-200';
    default:          return 'bg-gray-100 text-gray-600 border border-gray-200';
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

/* ─── Stat Card ──────────────────────────────────────────────────────────── */
const StatCard = ({ title, count, sub, icon, bg }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{count}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-9 h-9 sm:w-10 sm:h-10 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
    </div>
  </div>
);

/* ─── Section wrapper ────────────────────────────────────────────────────── */
const Section = ({ title, badge, action, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <h2 className="text-sm sm:text-base font-semibold text-gray-900">{title}</h2>
        {badge}
      </div>
      {action}
    </div>
    {children}
  </div>
);

/* ─── Election status tabs ───────────────────────────────────────────────── */
const ElectionStatusTabs = ({ elections }) => {
  const counts = {
    All:       elections.length,
    Active:    elections.filter(e => e.status === 'Active').length,
    Scheduled: elections.filter(e => e.status === 'Scheduled').length,
    Completed: elections.filter(e => e.status === 'Completed').length,
  };
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {Object.entries(counts).map(([label, count]) => (
        <span key={label} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
          {label}
          <span className="bg-white text-gray-800 rounded-full px-1.5 text-xs font-bold border border-gray-200 min-w-[18px] text-center">
            {count}
          </span>
        </span>
      ))}
    </div>
  );
};

/* ─── Mobile Cards ───────────────────────────────────────────────────────── */
const ElectionCard = ({ e }) => (
  <div className="px-4 py-4 border-b border-gray-100 last:border-0">
    <div className="flex items-start justify-between gap-3 mb-2">
      <p className="font-semibold text-gray-900 text-sm leading-snug flex-1">{e.title}</p>
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${getStatusColor(e.status)}`}>{e.status}</span>
    </div>
    <div className="flex items-center gap-3 text-xs text-gray-500 mb-2 flex-wrap">
      <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(e.election_date)}</span>
      <span className="flex items-center gap-1"><Clock size={11} />{formatTime(e.start_time)} – {formatTime(e.end_time)}</span>
    </div>
    <div className="grid grid-cols-4 gap-2 mb-2">
      {[
        { label: 'Wards',      value: e.ward_count ?? e.total_wards ?? '—' },
        { label: 'Candidates', value: e.candidate_count ?? '—' },
        { label: 'Voters',     value: e.voter_count ?? '—' },
        { label: 'Votes',      value: e.vote_count ?? '—' },
      ].map(({ label, value }) => (
        <div key={label} className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
          <p className="text-sm font-bold text-gray-800">{value}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
        </div>
      ))}
    </div>
    {e.assigned_admins?.length > 0 && (
      <div className="flex flex-wrap gap-1">
        {e.assigned_admins.map(a => <AdminPill key={a.id} name={a.name} />)}
      </div>
    )}
  </div>
);

const WardCard = ({ w }) => (
  <div className="px-4 py-4 border-b border-gray-100 last:border-0">
    <div className="flex items-start justify-between gap-3 mb-2">
      <div>
        <p className="font-semibold text-gray-900 text-sm">{w.ward_name}</p>
        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
          <MapPin size={10} /> {w.constituency ?? '—'} · Ward {w.ward_number}
        </p>
      </div>
      {w.election_title && (
        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full ring-1 ring-blue-200 flex-shrink-0 font-medium">
          {w.election_title}
        </span>
      )}
    </div>
    <div className="grid grid-cols-3 gap-2 mb-2">
      {[
        { label: 'Candidates', value: w.candidate_count ?? '—' },
        { label: 'Voters',     value: w.voter_count ?? '—' },
        { label: 'Votes Cast', value: w.votes_cast_count ?? '—' },
      ].map(({ label, value }) => (
        <div key={label} className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
          <p className="text-sm font-bold text-gray-800">{value}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
        </div>
      ))}
    </div>
    {w.created_by_name && (
      <p className="text-xs text-gray-400">Created by <span className="text-gray-600 font-medium">{w.created_by_name}</span></p>
    )}
  </div>
);

const AdminCard = ({ a }) => (
  <div className="px-4 py-4 border-b border-gray-100 last:border-0 flex items-center justify-between gap-3">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm flex-shrink-0">
        {a.name?.[0]?.toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{a.name}</p>
        <p className="text-xs text-gray-400 truncate">{a.email}</p>
      </div>
    </div>
    <div className="flex flex-col items-end gap-1 flex-shrink-0">
      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 border border-purple-200 capitalize">
        {a.role}
      </span>
      <span className="text-[10px] text-gray-400">{formatDate(a.created_at)}</span>
    </div>
  </div>
);

/* ─── Main Dashboard ─────────────────────────────────────────────────────── */
const MasterAdminDashboard = () => {
  const user      = useSelector((state) => state.auth.user);
  const navigate  = useNavigate();

  const [elections, setElections] = useState([]);
  const [wards, setWards]         = useState([]);
  const [admins, setAdmins]       = useState([]);
  const [loading, setLoading]     = useState(false);

  const fetchElections = async () => {
    try {
      setLoading(true);
      const response = await electionService.getAllElections();
      setElections(response.data || []);
    } catch { message.error("Failed to fetch elections"); }
    finally { setLoading(false); }
  };

  const fetchWards = async () => {
    try {
      const res = await wardService.getAllWards();
      if (res.success) setWards(res.data || []);
    } catch { message.error("Failed to fetch wards"); }
  };

  const fetchAdmins = async () => {
    try {
      const data = await adminService.getAllAdmins();
      setAdmins(Array.isArray(data) ? data : data.data || []);
    } catch { message.error("Failed to fetch admins"); }
  };

  useEffect(() => {
    fetchElections(); fetchWards(); fetchAdmins();
  }, []);

  const completedCount = elections.filter(e => e.status === 'Completed').length;
  const activeCount    = elections.filter(e => e.status === 'Active').length;
  const scheduledCount = elections.filter(e => e.status === 'Scheduled').length;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-gray-50 min-h-screen" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

      {/* ── Welcome ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 sm:px-6 py-4 sm:py-6">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Welcome, {user.name}</h1>
        <p className="text-gray-500 mt-1 text-xs sm:text-sm">Manage elections, wards, and administrators from your dashboard</p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Elections"
          count={elections.length}
          sub={<><span className="text-green-600 font-medium">{activeCount} active</span> · <span className="text-gray-400">{scheduledCount} scheduled</span></>}
          icon={<Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />}
          bg="bg-blue-50"
        />
        <StatCard
          title="Completed"
          count={completedCount}
          sub="elections finished"
          icon={<CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />}
          bg="bg-emerald-50"
        />
        <StatCard
          title="Total Wards"
          count={wards.length}
          sub="across all elections"
          icon={<MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />}
          bg="bg-orange-50"
        />
        <StatCard
          title="Administrators"
          count={admins.length}
          sub="registered admins"
          icon={<Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />}
          bg="bg-purple-50"
        />
      </div>

      {/* ══ ELECTIONS ══ */}
      <Section
        title="Elections"
        badge={<ElectionStatusTabs elections={elections} />}
        action={
          <button
            onClick={() => navigate('/masteradmin-election-list')}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span>Create Election</span>
          </button>
        }
      >
        {/* Mobile — cards */}
        <div className="sm:hidden divide-y divide-gray-100">
          {elections.length === 0
            ? <p className="text-center py-8 text-gray-400 text-sm">No elections found</p>
            : elections.map(e => <ElectionCard key={e.id} e={e} />)
          }
        </div>

        {/* Desktop — table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <Th>Title</Th>
                <Th>Election Date</Th>
                <Th>Time</Th>
                <Th>Status</Th>
                <Th>Assignees</Th>
                <Th>Wards</Th>
                <Th>Candidates</Th>
                <Th>Voters</Th>
                <Th>Votes Cast</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {elections.length === 0
                ? <tr><td colSpan={9} className="text-center py-8 text-gray-400">No elections found</td></tr>
                : elections.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{e.title}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(e.election_date)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatTime(e.start_time)} – {formatTime(e.end_time)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(e.status)}`}>{e.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {e.assigned_admins?.length > 0
                            ? e.assigned_admins.map(a => <AdminPill key={a.id} name={a.name} />)
                            : <span className="text-slate-300 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-center">{e.ward_count ?? e.total_wards ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-center">{e.candidate_count ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-center">{e.voter_count ?? '—'}</td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-800">{e.vote_count ?? '—'}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </Section>

      {/* ══ WARDS ══ */}
      <Section
        title="Wards"
        action={
          <button
            onClick={() => navigate('/masteradmin-ward-list')}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-orange-500 text-white text-xs sm:text-sm rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span>Add Ward</span>
          </button>
        }
      >
        {/* Mobile — cards */}
        <div className="sm:hidden divide-y divide-gray-100">
          {wards.length === 0
            ? <p className="text-center py-8 text-gray-400 text-sm">No wards found</p>
            : wards.map(w => <WardCard key={w.id} w={w} />)
          }
        </div>

        {/* Desktop — table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <Th>Ward Name</Th>
                <Th>Ward No.</Th>
                <Th>Constituency</Th>
                <Th>Election</Th>
                <Th>Candidates</Th>
                <Th>Voters</Th>
                <Th>Votes Cast</Th>
                <Th>Created By</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {wards.length === 0
                ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">No wards found</td></tr>
                : wards.map(w => (
                    <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{w.ward_name}</td>
                      <td className="px-4 py-3 text-gray-600">{w.ward_number}</td>
                      <td className="px-4 py-3 text-gray-600">{w.constituency}</td>
                      <td className="px-4 py-3 text-gray-600">{w.election_title ?? '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{w.candidate_count ?? '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{w.voter_count ?? '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{w.votes_cast_count ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{w.created_by_name ?? '—'}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </Section>

      {/* ══ ADMINS ══ */}
      <Section
        title="Administrators"
        action={
          <button
            onClick={() => navigate('/masteradmin-admin-list')}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-purple-600 text-white text-xs sm:text-sm rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span>Add Admin</span>
          </button>
        }
      >
        {/* Mobile — cards */}
        <div className="sm:hidden divide-y divide-gray-100">
          {admins.length === 0
            ? <p className="text-center py-8 text-gray-400 text-sm">No administrators found</p>
            : admins.map(a => <AdminCard key={a.id} a={a} />)
          }
        </div>

        {/* Desktop — table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Joined</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.length === 0
                ? <tr><td colSpan={4} className="text-center py-8 text-gray-400">No administrators found</td></tr>
                : admins.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                      <td className="px-4 py-3 text-gray-600">{a.email}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700 border border-purple-200 capitalize">{a.role}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(a.created_at)}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
};

export default MasterAdminDashboard;