import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, message, Spin, Button, Upload } from 'antd';
import { Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight, MapPin, Users } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setCandidates, addCandidate, updateCandidate, deleteCandidate,
  setLoading, setError, clearSelectedCandidate
} from '../../store/slices/candidateSlice';
import { candidateService } from '../../services/candidateService';
import { electionService } from '../../services/electionService';
import { wardService } from '../../services/wardService';
import dayjs from 'dayjs';

const { Option } = Select;

/* ─── Shared ─────────────────────────────────────────────────────────────── */
const Badge = ({ children, color = 'gray' }) => {
  const map = {
    green:  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    blue:   'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    orange: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200',
    gray:   'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[color]}`}>{children}</span>;
};

const statusColor = (s = '') => {
  if (s === 'Completed') return 'green';
  if (s === 'Scheduled') return 'blue';
  if (s === 'Active')    return 'orange';
  return 'gray';
};

const Spinner = () => (
  <div className="flex justify-center py-16">
    <div className="w-7 h-7 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
  </div>
);

const Breadcrumb = ({ items }) => (
  <div className="flex items-center gap-1 text-xs text-slate-400 flex-wrap">
    {items.map((item, i) => (
      <React.Fragment key={i}>
        {i > 0 && <ChevronRight size={12} className="text-slate-300" />}
        {item.onClick
          ? <button onClick={item.onClick} className="text-blue-500 hover:text-blue-700 font-medium transition-colors">{item.label}</button>
          : <span className="text-slate-600 font-semibold">{item.label}</span>}
      </React.Fragment>
    ))}
  </div>
);

const AdminPill = ({ name }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 ring-1 ring-violet-200">
    {name}
  </span>
);

/* ─── Election Card (mobile) ─────────────────────────────────────────────── */
const ElectionCard = ({ election, wards, onClick }) => {
  const elecWards = wards.filter(w => w.election_id === election.id);
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 cursor-pointer hover:border-blue-200 hover:shadow-md active:scale-[0.99] transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm leading-snug truncate">{election.title}</p>
        </div>
        <Badge color={statusColor(election.status)}>{election.status || '—'}</Badge>
      </div>
      {election.assigned_admins?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {election.assigned_admins.map(a => <AdminPill key={a.id} name={a.name} />)}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-50 rounded-xl px-3 py-2 text-center">
          <p className="text-base font-black text-slate-700">{election.total_wards ?? '0'}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Wards</p>
        </div>
        <div className="bg-slate-50 rounded-xl px-3 py-2 text-center">
          <p className="text-base font-black text-slate-700">{election.total_registered_voters ?? '0'}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Voters</p>
        </div>
      </div>
      <div className="flex items-center justify-end mt-3 text-xs text-blue-500 font-semibold gap-1">
        View Wards <ChevronRight size={13} />
      </div>
    </div>
  );
};

/* ─── Ward Card (mobile) ─────────────────────────────────────────────────── */
const WardCard = ({ ward, onClick }) => (
  <div
    onClick={onClick}
    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 cursor-pointer hover:border-blue-200 hover:shadow-md active:scale-[0.99] transition-all"
  >
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-semibold">
            Ward {ward.ward_number}
          </span>
        </div>
        <p className="font-bold text-slate-800 text-sm">{ward.ward_name}</p>
        {ward.constituency && (
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            <MapPin size={10} /> {ward.constituency}
          </p>
        )}
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-slate-50 rounded-xl px-3 py-2 text-center">
        <p className="text-base font-black text-slate-700">{ward.candidate_count ?? '0'}</p>
        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Candidates</p>
      </div>
      <div className="bg-slate-50 rounded-xl px-3 py-2 text-center">
        <p className="text-base font-black text-slate-700">{ward.voter_count ?? '—'}</p>
        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Voters</p>
      </div>
    </div>
    <div className="flex items-center justify-end mt-3 text-xs text-blue-500 font-semibold gap-1">
      View Candidates <ChevronRight size={13} />
    </div>
  </div>
);

const CandidateCard = ({ candidate, index, onEdit, onDelete }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0">
        {candidate.symbol
          ? <img src={`http://localhost:5000${candidate.symbol}`} alt="symbol" className="w-12 h-12 rounded-xl object-cover shadow-sm" />
          : <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">❓</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] text-slate-300 font-mono">#{index + 1}</span>
        </div>
        <p className="font-bold text-slate-800 text-sm truncate">{candidate.name}</p>
        {candidate.party && (
          <p className="text-xs text-slate-500 mt-0.5">{candidate.party}</p>
        )}
        <p className="text-[10px] text-slate-400 mt-1">
          Added {new Date(candidate.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(candidate)}
          className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Edit size={14} />
        </button>
        <button
          onClick={() => onDelete(candidate.id)}
          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  </div>
);

const fmt = (date) => date ? dayjs(date).format("DD MMM YYYY, hh:mm A") : "—";

/* ─── Main Component ─────────────────────────────────────────────────────── */
const CandidatesList = () => {
  const dispatch = useDispatch();
  const { candidates, loading } = useSelector(state => state.candidates);

  const [elections, setElections]           = useState([]);
  const [wards, setWards]                   = useState([]);
  const [activeElections, setActiveElections] = useState([]);
  const [initLoading, setInitLoading]       = useState(true);
  const [electionLoading, setElectionLoading] = useState(false);
  const [wardLoading, setWardLoading]       = useState(false);

  const [view, setView]                     = useState('elections');
  const [selectedElection, setSelElection]  = useState(null);
  const [selectedWard, setSelWard]          = useState(null);

  const [elecSearch, setElecSearch]         = useState('');
  const [wardSearch, setWardSearch]         = useState('');
  const [candidateSearch, setCandSearch]    = useState('');

  const [isModalOpen, setIsModalOpen]           = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [form] = Form.useForm();
  const [wardCandidates, setWardCandidates]     = useState([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [selectedElectionInForm, setSelectedElectionInForm] = useState(null);
  
  /* ── fetch ── */
  const fetchActiveElections = async () => {
    try {
      setElectionLoading(true);
      const res = await electionService.getActiveElectionsForAdmin();
      if (res.success) setActiveElections(res.data);
    } catch { message.error('No active election found'); }
    finally { setElectionLoading(false); }
  };

  const fetchWards = async () => {
    try {
      setWardLoading(true);
      const res = await wardService.getAllWardsForAdmin();
      if (res.success) setWards(res.data || []);
    } catch { message.error('Failed to fetch wards'); }
    finally { setWardLoading(false); }
  };

  useEffect(() => {
    const init = async () => {
      await fetchActiveElections();
      await fetchWards();
      setInitLoading(false);
    };
    init();
  }, []);

  /* ── navigation ── */
  const handleElectionClick = (election) => {
    setSelElection(election); setSelWard(null); setWardSearch(''); setView('wards');
  };

  const handleWardClick = async (ward) => {
    setSelWard(ward); setCandSearch(''); setView('candidates');
    try {
      setCandidateLoading(true);
      const res = await candidateService.getAdminCandidateByElectionAndWardForAdmin(selectedElection.id, ward.id);
      if (res.success) setWardCandidates(res.data || []);
    } catch { message.error('Failed to load candidates'); }
    finally { setCandidateLoading(false); }
  };

  const goToElections = () => { setView('elections'); setSelElection(null); setSelWard(null); setElecSearch(''); };
  const goToWards     = () => { setView('wards'); setSelWard(null); setWardSearch(''); };

  /* ── modal ── */
  const showModal = () => { 
    setEditingCandidate(null); 
    form.resetFields(); 
    setSelectedElectionInForm(null);
    setIsModalOpen(true); 
  };

  const showEditModal = (candidate) => {
    setEditingCandidate(candidate);
    setSelectedElectionInForm(candidate.election_id);
    const symbolFileList = candidate.symbol
      ? [{ uid: '-1', name: 'current-symbol', status: 'done', url: `http://localhost:5000${candidate.symbol}` }]
      : [];
    form.setFieldsValue({
      name: candidate.name, party: candidate.party, symbol: symbolFileList,
      electionId: candidate.election_id, wardId: candidate.ward_id,
    });
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false); setEditingCandidate(null); form.resetFields();
    dispatch(clearSelectedCandidate());
  };

  const handleSubmit = async (values) => {
    try {
      const formData = new FormData();
      if (values.name)       formData.append('name', values.name);
      if (values.party)      formData.append('party', values.party);
      if (values.symbol?.[0]?.originFileObj) formData.append('symbol', values.symbol[0].originFileObj);
      if (values.electionId) formData.append('election_id', values.electionId);
      if (values.wardId)     formData.append('ward_id', values.wardId);

      let response;
      if (editingCandidate) {
        formData.append('id', editingCandidate.id);
        response = await candidateService.updateCandidate(formData);
        dispatch(updateCandidate(response.data));
        message.success('Candidate updated successfully!');
      } else {
        response = await candidateService.createCandidate(formData);
        dispatch(addCandidate(response.data));
        message.success('Candidate added successfully!');
      }
      handleCancel(); fetchWards(); fetchActiveElections();

      // Refresh candidate list if on candidates view
      if (selectedWard) {
        const res = await candidateService.getAdminCandidateByElectionAndWardForAdmin(selectedElection.id, selectedWard.id);
        if (res.success) setWardCandidates(res.data || []);
      }
    } catch (err) {
      message.error(err?.response?.data?.error || 'Failed to save candidate');
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete Candidate', content: 'Are you sure you want to delete this candidate?',
      okText: 'Delete', okType: 'danger',
      onOk: async () => {
        try {
          await candidateService.deleteCandidate(id);
          dispatch(deleteCandidate(id));
          setWardCandidates(prev => prev.filter(c => c.id !== id));
          message.success('Candidate deleted successfully!');
        } catch { message.error('Failed to delete candidate'); }
      }
    });
  };

  const electionWards = wards.filter(w => w.election_id === selectedElection?.id);

  const filteredElections = activeElections.filter(e =>
    !elecSearch || e.title?.toLowerCase().includes(elecSearch.toLowerCase()) || e.status?.toLowerCase().includes(elecSearch.toLowerCase())
  );
  const filteredWards = electionWards.filter(w =>
    !wardSearch || w.ward_name?.toLowerCase().includes(wardSearch.toLowerCase()) || String(w.ward_number || '').toLowerCase().includes(wardSearch.toLowerCase())
  );
  const filteredCandidates = wardCandidates.filter(c =>
    !candidateSearch || c.name?.toLowerCase().includes(candidateSearch.toLowerCase()) || c.party?.toLowerCase().includes(candidateSearch.toLowerCase())
  );

  const breadcrumbItems = [
    { label: 'Elections', onClick: view !== 'elections' ? goToElections : null },
    ...(selectedElection ? [{ label: selectedElection.title, onClick: view === 'candidates' ? goToWards : null }] : []),
    ...(selectedWard     ? [{ label: selectedWard.ward_name }] : []),
  ];

  return (
    <div className="space-y-4 sm:space-y-5" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

      <div className="bg-white px-4 sm:px-6 py-4 sm:py-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {view !== 'elections' && (
            <button
              onClick={view === 'candidates' ? goToWards : goToElections}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors flex-shrink-0"
            >
              <ChevronLeft size={16} /> <span className="hidden sm:inline">Back</span>
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-slate-800 tracking-tight truncate">
              {view === 'elections'  && 'Candidates Management'}
              {view === 'wards'      && <><span className="hidden sm:inline">Wards — </span><span className="text-blue-600">{selectedElection?.title}</span></>}
              {view === 'candidates' && <><span className="hidden sm:inline">Candidates — </span><span className="text-blue-600">{selectedWard?.ward_name}</span></>}
            </h1>
            <div className="mt-0.5 hidden sm:block"><Breadcrumb items={breadcrumbItems} /></div>
          </div>
        </div>
        {view === 'candidates' && (
          <button
            onClick={showModal}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm rounded-lg font-medium transition-colors flex-shrink-0"
          >
            <Plus size={14} /> <span>Add Candidate</span>
          </button>
        )}
      </div>

      {view === 'elections' && (
        <>
          <div className="bg-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative max-w-sm">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input className="pl-9 w-full border border-slate-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Search elections…" value={elecSearch} onChange={e => setElecSearch(e.target.value)} />
            </div>
          </div>

          {initLoading ? <Spinner /> : (
            <>
              <div className="flex flex-col gap-3 sm:hidden">
                {filteredElections.length === 0
                  ? <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-14 text-center text-slate-400 text-sm">No elections found.</div>
                  : filteredElections.map(e => <ElectionCard key={e.id} election={e} wards={wards} onClick={() => handleElectionClick(e)} />)
                }
              </div>

              <div className="hidden sm:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                        <th className="px-5 py-3 text-left font-semibold">Election Title</th>
                        <th className="px-5 py-3 text-center font-semibold">Assignees</th>
                        <th className="px-5 py-3 text-center font-semibold">Status</th>
                        <th className="px-5 py-3 text-center font-semibold">Wards</th>
                        <th className="px-5 py-3 text-center font-semibold">Voters</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredElections.length === 0 && <tr><td colSpan={5} className="py-14 text-center text-slate-400 text-sm">No elections found.</td></tr>}
                      {filteredElections.map(election => (
                        <tr key={election.id} onClick={() => handleElectionClick(election)} className="cursor-pointer hover:bg-blue-50 transition-colors group">
                          <td className="px-5 py-3 font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">{election.title}</td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {election.assigned_admins?.length > 0
                                ? election.assigned_admins.map(a => <AdminPill key={a.id} name={a.name} />)
                                : <span className="text-slate-300 text-xs">—</span>}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center"><Badge color={statusColor(election.status)}>{election.status || '—'}</Badge></td>
                          <td className="px-5 py-3 text-center text-slate-600">{election.total_wards ?? '0'}</td>
                          <td className="px-5 py-3 text-center text-slate-600">{election.total_registered_voters ?? '0'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {view === 'wards' && (
        <>
          <div className="bg-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative max-w-sm">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input className="pl-9 w-full border border-slate-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Search ward…" value={wardSearch} onChange={e => setWardSearch(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:hidden">
            {filteredWards.length === 0
              ? <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-14 text-center text-slate-400 text-sm">No wards found for this election.</div>
              : filteredWards.map(w => <WardCard key={w.id} ward={w} onClick={() => handleWardClick(w)} />)
            }
          </div>

          <div className="hidden sm:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                    <th className="px-5 py-3 text-left font-semibold">Ward No.</th>
                    <th className="px-5 py-3 text-left font-semibold">Ward Name</th>
                    <th className="px-5 py-3 text-center font-semibold">Candidates</th>
                    <th className="px-5 py-3 text-center font-semibold">Voters</th>
                    <th className="px-5 py-3 text-left font-semibold">Constituency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredWards.length === 0 && <tr><td colSpan={5} className="py-14 text-center text-slate-400 text-sm">No wards found for this election.</td></tr>}
                  {filteredWards.map(ward => (
                    <tr key={ward.id} onClick={() => handleWardClick(ward)} className="cursor-pointer hover:bg-blue-50 transition-colors group">
                      <td className="px-5 py-3 font-mono text-xs text-slate-400">{ward.ward_number}</td>
                      <td className="px-5 py-3 font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">{ward.ward_name}</td>
                      <td className="px-5 py-3 text-center text-slate-600">{ward.candidate_count ?? 0}</td>
                      <td className="px-5 py-3 text-center text-slate-600">{ward.voter_count ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-500">{ward.constituency ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {view === 'candidates' && (
        <>
          <div className="bg-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative max-w-sm">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input className="pl-9 w-full border border-slate-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Search by name or party…" value={candidateSearch} onChange={e => setCandSearch(e.target.value)} />
            </div>
          </div>

          {candidateLoading ? <Spinner /> : (
            <>
              <div className="flex flex-col gap-3 sm:hidden">
                {filteredCandidates.length === 0
                  ? <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-14 text-center text-slate-400 text-sm">
                      {wardCandidates.length === 0 ? 'No candidates registered for this ward.' : 'No results match your search.'}
                    </div>
                  : filteredCandidates.map((c, i) => (
                      <CandidateCard key={c.id} candidate={c} index={i} onEdit={showEditModal} onDelete={handleDelete} />
                    ))
                }
              </div>

              <div className="hidden sm:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                        <th className="px-5 py-3 text-left font-semibold">Sr.</th>
                        <th className="px-5 py-3 text-left font-semibold">Symbol</th>
                        <th className="px-5 py-3 text-left font-semibold">Candidate Name</th>
                        <th className="px-5 py-3 text-left font-semibold">Party</th>
                        <th className="px-5 py-3 text-left font-semibold">Added On</th>
                        <th className="px-5 py-3 text-left font-semibold">Created By</th>
                        <th className="px-5 py-3 text-left font-semibold">Updated By</th>
                        <th className="px-5 py-3 text-left font-semibold">Updated At</th>
                        <th className="px-5 py-3 text-center font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredCandidates.length === 0 && (
                        <tr><td colSpan={6} className="py-14 text-center text-slate-400 text-sm">
                          {wardCandidates.length === 0 ? 'No candidates registered for this ward.' : 'No results match your search.'}
                        </td></tr>
                      )}
                      {filteredCandidates.map((candidate, index) => (
                        <tr key={candidate.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 text-slate-400 text-xs">{index + 1}</td>
                          <td className="px-5 py-3">
                            {candidate.symbol
                              ? <img src={`http://localhost:5000${candidate.symbol}`} alt="symbol" className="h-8 w-8 rounded object-cover" />
                              : <span className="text-xl">❓</span>}
                          </td>
                          <td className="px-5 py-3 font-semibold text-slate-800">{candidate.name}</td>
                          <td className="px-5 py-3 text-slate-600">{candidate.party}</td>
                          <td className="px-5 py-3 text-slate-500">
                            {new Date(candidate.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-5 py-3 text-slate-500">
                            {candidate.created_by_name}
                          </td>
                          <td className="px-5 py-3 text-slate-500">
                            {candidate.updated_by_name}
                          </td>
                          <td className="px-5 py-3 text-slate-500">
                            {fmt(candidate.updated_at)}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-center gap-3">
                              <button onClick={() => showEditModal(candidate)} className="p-1 text-blue-500 hover:text-blue-700 transition-colors"><Edit size={15} /></button>
                              <button onClick={() => handleDelete(candidate.id)} className="p-1 text-red-400 hover:text-red-600 transition-colors"><Trash2 size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredCandidates.length > 0 && (
                    <div className="px-5 py-3 border-t border-slate-50 text-xs text-slate-400 text-right">
                      {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      <Modal
        title={<span className="font-semibold text-slate-800">{editingCandidate ? 'Edit Candidate' : 'Add New Candidate'}</span>}
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        width="min(600px, 95vw)"
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Form.Item name="name" label="Candidate Name" rules={[{ required: true, message: 'Please enter candidate name' }]}>
              <Input placeholder="Enter candidate name" size="large" />
            </Form.Item>
            <Form.Item name="party" label="Party Name" rules={[{ required: true, message: 'Please enter party name' }]}>
              <Input placeholder="Enter party name" size="large" />
            </Form.Item>
          </div>

          <Form.Item name="symbol" label="Party Symbol" valuePropName="fileList" getValueFromEvent={e => (Array.isArray(e) ? e : e?.fileList)}>
            <Upload beforeUpload={() => false} listType="picture">
              <Button>Select Symbol</Button>
            </Upload>
          </Form.Item>

          <Form.Item name="electionId" label="Election" rules={[{ required: true, message: 'Please select an election' }]}>
            <Select 
              placeholder="Select election" 
              size="large" 
              loading={electionLoading}
              onChange={(val) => {
                setSelectedElectionInForm(val);
                form.setFieldValue('wardId', undefined); 
              }}
            >
              {activeElections.map(e => <Option key={e.id} value={e.id}>{e.title}</Option>)}
            </Select>
          </Form.Item>

          <Form.Item name="wardId" label="Ward" rules={[{ required: true, message: 'Please select a ward' }]}>
            <Select placeholder="Select ward" size="large" loading={wardLoading}>
              {wards
                .filter(w => w.election_id === selectedElectionInForm) 
                .map(w => (
                  <Option key={w.id} value={w.id}>
                    {`Ward ${w.ward_number} - ${w.ward_name} (${w.constituency})`}
                  </Option>
                ))
              }
            </Select>
          </Form.Item>

          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={handleCancel}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm">
              Cancel
            </button>
            <button type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              {editingCandidate ? 'Update' : 'Add'} Candidate
            </button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default CandidatesList;