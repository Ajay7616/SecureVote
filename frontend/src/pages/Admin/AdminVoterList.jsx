import React, { useState, useEffect } from 'react';
import { message, Modal } from 'antd';
import { Search, ChevronLeft, Users, ChevronRight, Download, Trash2, Calendar, Vote, Building2, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';
import { wardService } from '../../services/wardService';
import { electionService } from '../../services/electionService';
import { voterService } from '../../services/voterService';

/* ─── Badge ─────────────────────────────────────────────────────────────── */
const Badge = ({ children, color = 'gray' }) => {
  const map = {
    green:  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    blue:   'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    gray:   'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
    orange: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200',
    red:    'bg-red-50 text-red-600 ring-1 ring-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[color]}`}>
      {children}
    </span>
  );
};

const statusColor = (s = '') => {
  if (s === 'Completed') return 'green';
  if (s === 'Scheduled') return 'blue';
  if (s === 'Active')    return 'orange';
  return 'gray';
};

const Spinner = () => (
  <div className="flex justify-center py-16">
    <div className="w-7 h-7 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
  </div>
);

const Breadcrumb = ({ items }) => (
  <div className="flex items-center gap-1 text-xs text-slate-400 flex-wrap">
    {items.map((item, i) => (
      <React.Fragment key={i}>
        {i > 0 && <ChevronRight size={12} className="text-slate-300" />}
        {item.onClick ? (
          <button onClick={item.onClick} className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
            {item.label}
          </button>
        ) : (
          <span className="text-slate-600 font-semibold">{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </div>
);

const AdminPill = ({ name }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 ring-1 ring-violet-200">
    {name}
  </span>
);

/* ─── XLSX Export Helpers ────────────────────────────────────────────────── */
const buildExportRows = (voterRows, electionTitle, wardName) =>
  voterRows.map((v) => ({
    'Voter ID':   v.voter_id  || v.id,
    'Name':       v.name      || '',
    'Email':      v.email     || '',
    'Mobile':     v.mobile    || '',
    'Address':    v.address   || '',
    'Ward':       wardName    || v.ward_name || '',
    'Election':   electionTitle || v.election_title || '',
    'Login ID':   v.login_id  || '',
    'Has Voted':  v.has_voted ? 'Yes' : 'No',
  }));

const downloadXlsx = (rows, filename) => {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 16 }, { wch: 24 }, { wch: 30 }, { wch: 16 },
    { wch: 36 }, { wch: 24 }, { wch: 30 }, { wch: 22 }, { wch: 10 },
  ];
  const headerRange = XLSX.utils.decode_range(ws['!ref']);
  for (let C = headerRange.s.c; C <= headerRange.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = {
      font:      { bold: true, name: 'Arial', sz: 11 },
      fill:      { fgColor: { rgb: 'E8EFFE' }, patternType: 'solid' },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border:    { bottom: { style: 'thin', color: { rgb: 'AAAAAA' } } },
    };
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Voters');
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

/* ─── Election Card (mobile) ─────────────────────────────────────────────── */
const ElectionCard = ({ election, onElectionClick, onDownload, downloadingId }) => (
  <div
    onClick={() => onElectionClick(election)}
    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 cursor-pointer hover:border-indigo-200 hover:shadow-md active:scale-[0.99] transition-all"
  >
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-800 text-sm leading-snug truncate">{election.title}</p>
        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
          <Calendar size={10} />
          {election.election_date
            ? new Date(election.election_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—'}
        </p>
      </div>
      <Badge color={statusColor(election.status)}>{election.status || '—'}</Badge>
    </div>

    {election.assigned_admins?.length > 0 && (
      <div className="flex flex-wrap gap-1 mb-3">
        {election.assigned_admins.map(a => <AdminPill key={a.id} name={a.name} />)}
      </div>
    )}

    {/* Stats */}
    <div className="grid grid-cols-4 gap-2 mb-3">
      {[
        { label: 'Wards',      value: election.ward_count ?? '0' },
        { label: 'Voters',     value: election.voter_count ?? '0' },
        { label: 'Candidates', value: election.candidate_count ?? '0' },
        { label: 'Votes',      value: election.vote_count ?? '0' },
      ].map(({ label, value }) => (
        <div key={label} className="bg-slate-50 rounded-xl px-2 py-2 text-center">
          <p className="text-sm font-black text-slate-700">{value}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">{label}</p>
        </div>
      ))}
    </div>

    <div className="flex items-center justify-between">
      <span className="text-xs text-indigo-500 font-semibold flex items-center gap-1">
        View Wards <ChevronRight size={13} />
      </span>
      <button
        onClick={(e) => onDownload(e, election)}
        disabled={downloadingId === `election-${election.id}`}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors"
      >
        <Download size={12} />
        {downloadingId === `election-${election.id}` ? 'Loading…' : 'Export'}
      </button>
    </div>
  </div>
);

/* ─── Ward Card (mobile) ─────────────────────────────────────────────────── */
const WardCard = ({ ward, onWardClick, onDownload, downloadingId }) => (
  <div
    onClick={() => onWardClick(ward)}
    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 cursor-pointer hover:border-indigo-200 hover:shadow-md active:scale-[0.99] transition-all"
  >
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-semibold">
            Ward {ward.ward_number}
          </span>
        </div>
        <p className="font-bold text-slate-800 text-sm leading-snug">{ward.ward_name}</p>
        {ward.constituency && (
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            <MapPin size={10} /> {ward.constituency}
          </p>
        )}
      </div>
    </div>

    <div className="grid grid-cols-3 gap-2 mb-3">
      {[
        { label: 'Voters',     value: ward.voter_count ?? '—' },
        { label: 'Candidates', value: ward.candidate_count ?? '—' },
        { label: 'Votes Cast', value: ward.votes_cast_count ?? '—' },
      ].map(({ label, value }) => (
        <div key={label} className="bg-slate-50 rounded-xl px-2 py-2 text-center">
          <p className="text-sm font-black text-slate-700">{value}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">{label}</p>
        </div>
      ))}
    </div>

    <div className="flex items-center justify-between">
      <span className="text-xs text-indigo-500 font-semibold flex items-center gap-1">
        View Voters <ChevronRight size={13} />
      </span>
      <button
        onClick={(e) => onDownload(e, ward)}
        disabled={downloadingId === `ward-${ward.id}`}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors"
      >
        <Download size={12} />
        {downloadingId === `ward-${ward.id}` ? 'Loading…' : 'Export'}
      </button>
    </div>
  </div>
);

/* ─── Voter Card (mobile) ────────────────────────────────────────────────── */
const VoterCard = ({ voter, onDelete }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
          {voter.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-800 text-sm truncate">{voter.name}</p>
          <p className="text-xs font-mono text-slate-400 mt-0.5">{voter.voter_id || voter.id}</p>
        </div>
      </div>
      <button
        onClick={() => onDelete(voter)}
        title={voter.has_voted ? 'Cannot delete — voter has voted' : 'Delete voter'}
        className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
          voter.has_voted
            ? 'text-slate-300 cursor-not-allowed'
            : 'text-red-400 hover:text-red-600 hover:bg-red-50'
        }`}
      >
        <Trash2 size={15} />
      </button>
    </div>

    <div className="grid grid-cols-3 gap-2 mt-3">
      <div className="bg-slate-50 rounded-xl px-2 py-2 text-center">
        <p className="text-sm font-bold text-slate-700">{voter.age ?? '—'}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Age</p>
      </div>
      <div className="bg-slate-50 rounded-xl px-2 py-2 text-center">
        <p className="text-sm font-bold text-slate-700 capitalize">{voter.gender ?? '—'}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Gender</p>
      </div>
      <div className="bg-slate-50 rounded-xl px-2 py-2 text-center flex flex-col items-center justify-center gap-1">
        <Badge color={voter.has_voted ? 'green' : 'gray'}>{voter.has_voted ? 'Voted' : 'Not Yet'}</Badge>
      </div>
    </div>

    {voter.created_by_name && (
      <p className="text-xs text-slate-400 mt-2">Added by <span className="text-slate-600 font-medium">{voter.created_by_name}</span></p>
    )}
  </div>
);

/* ─── Main Component ─────────────────────────────────────────────────────── */
const AdminVotersList = () => {
  const [elections, setElections]           = useState([]);
  const [wards, setWards]                   = useState([]);
  const [voters, setVoters]                 = useState([]);
  const [initLoading, setInitLoading]       = useState(true);
  const [votersLoading, setVL]              = useState(false);
  const [downloadingId, setDownloadingId]   = useState(null);

  const [view, setView]                     = useState('elections');
  const [selectedElection, setSelElection]  = useState(null);
  const [selectedWard, setSelWard]          = useState(null);

  const [elecSearch, setElecSearch]   = useState('');
  const [wardSearch, setWardSearch]   = useState('');
  const [voterSearch, setVoterSearch] = useState('');

  /* ── initial load ── */
  useEffect(() => {
    (async () => {
      try {
        const [eRes, wRes] = await Promise.all([
          electionService.getActiveElectionsForAdmin(),
          wardService.getAllWardsForAdmin(),
        ]);
        setElections(eRes.data || []);
        setWards(wRes.data    || []);
      } catch {
        message.error('Failed to load data');
      } finally {
        setInitLoading(false);
      }
    })();
  }, []);

  /* ── navigation ── */
  const handleElectionClick = (election) => {
    setSelElection(election); setSelWard(null); setVoters([]);
    setWardSearch(''); setView('wards');
  };

  const handleWardClick = async (ward) => {
    setSelWard(ward); setVoters([]); setVoterSearch(''); setView('voters'); setVL(true);
    try {
      const res = await voterService.getAllVotersForAdmin(ward.id, ward.election_id);
      setVoters(res.data || []);
    } catch { message.error('Failed to load voters'); }
    finally { setVL(false); }
  };

  const goToElections = () => { setView('elections'); setSelElection(null); setSelWard(null); setVoters([]); setElecSearch(''); };
  const goToWards     = () => { setView('wards'); setSelWard(null); setVoters([]); setWardSearch(''); };

  /* ── download election ── */
  const handleDownloadElection = async (e, election) => {
    e.stopPropagation();
    try {
      setDownloadingId(`election-${election.id}`);
      const electionWardList = wards.filter(w => w.election_id === election.id);
      const results = await Promise.all(
        electionWardList.map(w =>
          voterService.getAllVotersForAdmin(w.id, election.id).then(r => ({ voters: r.data || [], ward: w }))
        )
      );
      const wb = XLSX.utils.book_new();
      let totalVoters = 0;
      results.forEach(({ voters: vList, ward }) => {
        const wardLabel = ward.ward_name || ward.constituency || `Ward_${ward.id}`;
        const rows = buildExportRows(vList, election.title, wardLabel);
        totalVoters += rows.length;
        const sheetName = wardLabel.replace(/[\\/*?[\]:]/g, '').slice(0, 31);
        const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{}]);
        ws['!cols'] = [{ wch: 16 }, { wch: 24 }, { wch: 30 }, { wch: 16 }, { wch: 36 }, { wch: 24 }, { wch: 30 }, { wch: 10 }];
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        for (let C = range.s.c; C <= range.e.c; C++) {
          const addr = XLSX.utils.encode_cell({ r: 0, c: C });
          if (!ws[addr]) continue;
          ws[addr].s = { font: { bold: true, name: 'Arial', sz: 11 }, fill: { fgColor: { rgb: 'E8EFFE' }, patternType: 'solid' }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: { bottom: { style: 'thin', color: { rgb: 'AAAAAA' } } } };
        }
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });
      if (totalVoters === 0) { message.info('No voters found for this election.'); return; }
      XLSX.writeFile(wb, `Voters_${election.title.replace(/\s+/g, '_')}.xlsx`);
      message.success(`Downloaded ${totalVoters} voters across ${results.length} ward(s)`);
    } catch { message.error('Failed to download voters'); }
    finally { setDownloadingId(null); }
  };

  /* ── download ward ── */
  const handleDownloadWard = async (e, ward) => {
    e.stopPropagation();
    try {
      setDownloadingId(`ward-${ward.id}`);
      const res = await voterService.getAllVotersForAdmin(ward.id, ward.election_id);
      const voterList = res.data || [];
      if (voterList.length === 0) { message.info('No voters found for this ward.'); return; }
      const rows = buildExportRows(voterList, selectedElection?.title || '', ward.ward_name || ward.constituency || '');
      downloadXlsx(rows, `Voters_${ward.ward_name?.replace(/\s+/g, '_') || ward.id}`);
      message.success(`Downloaded ${rows.length} voters`);
    } catch { message.error('Failed to download voters'); }
    finally { setDownloadingId(null); }
  };

  /* ── delete voter ── */
  const handleDeleteVoter = (voter) => {
    Modal.confirm({
      title: 'Delete Voter',
      content: voter.has_voted
        ? 'This voter has already voted and cannot be deleted.'
        : `Are you sure you want to delete voter "${voter.name}"?`,
      okText: voter.has_voted ? 'OK' : 'Delete',
      okType: voter.has_voted ? 'default' : 'danger',
      cancelButtonProps: voter.has_voted ? { style: { display: 'none' } } : {},
      onOk: async () => {
        if (voter.has_voted) return;
        try {
          await voterService.deleteVoter(voter.id);
          setVoters(prev => prev.filter(v => v.id !== voter.id));
          message.success('Voter deleted');
        } catch (error) {
          message.error(error?.response?.data?.error || 'Failed to delete voter');
        }
      },
    });
  };

  /* ── filtered ── */
  const filteredElections = elections.filter(e =>
    !elecSearch || e.title?.toLowerCase().includes(elecSearch.toLowerCase()) || e.status?.toLowerCase().includes(elecSearch.toLowerCase())
  );
  const electionWards  = wards.filter(w => w.election_id === selectedElection?.id);
  const filteredWards  = electionWards.filter(w =>
    !wardSearch || w.ward_name?.toLowerCase().includes(wardSearch.toLowerCase()) || w.ward_number?.toLowerCase().includes(wardSearch.toLowerCase())
  );
  const filteredVoters = voters.filter(v =>
    !voterSearch || v.name?.toLowerCase().includes(voterSearch.toLowerCase()) || String(v.voter_id || '').toLowerCase().includes(voterSearch.toLowerCase())
  );

  const breadcrumbItems = [
    { label: 'Elections', onClick: view !== 'elections' ? goToElections : null },
    ...(selectedElection ? [{ label: selectedElection.title, onClick: view === 'voters' ? goToWards : null }] : []),
    ...(selectedWard     ? [{ label: selectedWard.ward_name }] : []),
  ];

  /* ─── RENDER ─────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4 sm:space-y-5" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

      {/* ── Header ── */}
      <div className="bg-white px-4 sm:px-6 py-4 sm:py-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {view !== 'elections' && (
              <button
                onClick={view === 'voters' ? goToWards : goToElections}
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors flex-shrink-0"
              >
                <ChevronLeft size={16} /> <span className="hidden sm:inline">Back</span>
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-slate-800 tracking-tight truncate">
                {view === 'elections' && 'Voters Management'}
                {view === 'wards'     && <><span className="hidden sm:inline">Wards — </span><span className="text-indigo-600">{selectedElection?.title}</span></>}
                {view === 'voters'    && <><span className="hidden sm:inline">Voters — </span><span className="text-indigo-600">{selectedWard?.ward_name}</span></>}
              </h1>
              <div className="mt-0.5 hidden sm:block"><Breadcrumb items={breadcrumbItems} /></div>
            </div>
          </div>
          <div className="flex-shrink-0">
            {view === 'voters' && (
              <Badge color="blue"><Users size={11} className="mr-1 inline" />{voters.length} voters</Badge>
            )}
            {view === 'wards' && (
              <Badge color="blue">{electionWards.length} ward{electionWards.length !== 1 ? 's' : ''}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* ══ ELECTIONS ══ */}
      {view === 'elections' && (
        <>
          <div className="bg-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative max-w-sm">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input className="pl-9 w-full border border-slate-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Search elections…" value={elecSearch} onChange={e => setElecSearch(e.target.value)} />
            </div>
          </div>

          {initLoading ? <Spinner /> : (
            <>
              {/* Mobile — cards */}
              <div className="flex flex-col gap-3 sm:hidden">
                {filteredElections.length === 0
                  ? <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-14 text-center text-slate-400 text-sm">No elections found.</div>
                  : filteredElections.map(e => (
                      <ElectionCard key={e.id} election={e} onElectionClick={handleElectionClick} onDownload={handleDownloadElection} downloadingId={downloadingId} />
                    ))
                }
              </div>

              {/* Desktop — table */}
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
                        <th className="px-5 py-3 text-center font-semibold">Candidates</th>
                        <th className="px-5 py-3 text-center font-semibold">Votes Cast</th>
                        <th className="px-5 py-3 text-left font-semibold">Election Date</th>
                        <th className="px-5 py-3 text-center font-semibold">Export</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredElections.length === 0 && <tr><td colSpan={9} className="py-14 text-center text-slate-400 text-sm">No elections found.</td></tr>}
                      {filteredElections.map(election => (
                        <tr key={election.id} onClick={() => handleElectionClick(election)} className="cursor-pointer hover:bg-indigo-50 transition-colors group">
                          <td className="px-5 py-3 font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">{election.title}</td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {election.assigned_admins?.length > 0 ? election.assigned_admins.map(a => <AdminPill key={a.id} name={a.name} />) : <span className="text-slate-300 text-xs">—</span>}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center"><Badge color={statusColor(election.status)}>{election.status}</Badge></td>
                          <td className="px-5 py-3 text-center text-slate-600">{election.ward_count ?? '—'}</td>
                          <td className="px-5 py-3 text-center text-slate-600">{election.voter_count ?? '—'}</td>
                          <td className="px-5 py-3 text-center text-slate-600">{election.candidate_count ?? '—'}</td>
                          <td className="px-5 py-3 text-center text-slate-600">{election.vote_count ?? '—'}</td>
                          <td className="px-5 py-3 text-slate-500">{election.election_date ? new Date(election.election_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                          <td className="px-5 py-3 text-center">
                            <button onClick={(e) => handleDownloadElection(e, election)} disabled={downloadingId === `election-${election.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                              <Download size={13} />{downloadingId === `election-${election.id}` ? 'Loading…' : 'Download'}
                            </button>
                          </td>
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

      {/* ══ WARDS ══ */}
      {view === 'wards' && (
        <>
          <div className="bg-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative max-w-sm">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input className="pl-9 w-full border border-slate-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Search ward…" value={wardSearch} onChange={e => setWardSearch(e.target.value)} />
            </div>
          </div>

          {/* Mobile — cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {filteredWards.length === 0
              ? <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-14 text-center text-slate-400 text-sm">No wards found for this election.</div>
              : filteredWards.map(w => (
                  <WardCard key={w.id} ward={w} onWardClick={handleWardClick} onDownload={handleDownloadWard} downloadingId={downloadingId} />
                ))
            }
          </div>

          {/* Desktop — table */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                    <th className="px-5 py-3 text-left font-semibold">Ward No.</th>
                    <th className="px-5 py-3 text-left font-semibold">Ward Name</th>
                    <th className="px-5 py-3 text-center font-semibold">Voters</th>
                    <th className="px-5 py-3 text-center font-semibold">Candidates</th>
                    <th className="px-5 py-3 text-center font-semibold">Votes Cast</th>
                    <th className="px-5 py-3 text-left font-semibold">Constituency</th>
                    <th className="px-5 py-3 text-center font-semibold">Export</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredWards.length === 0 && <tr><td colSpan={7} className="py-14 text-center text-slate-400 text-sm">No wards found for this election.</td></tr>}
                  {filteredWards.map(ward => (
                    <tr key={ward.id} onClick={() => handleWardClick(ward)} className="cursor-pointer hover:bg-indigo-50 transition-colors group">
                      <td className="px-5 py-3 text-slate-500 font-mono text-xs">{ward.ward_number}</td>
                      <td className="px-5 py-3 font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">{ward.ward_name}</td>
                      <td className="px-5 py-3 text-center text-slate-600">{ward.voter_count ?? '—'}</td>
                      <td className="px-5 py-3 text-center text-slate-600">{ward.candidate_count ?? '—'}</td>
                      <td className="px-5 py-3 text-center text-slate-600">{ward.votes_cast_count ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-500">{ward.constituency ?? '—'}</td>
                      <td className="px-5 py-3 text-center">
                        <button onClick={(e) => handleDownloadWard(e, ward)} disabled={downloadingId === `ward-${ward.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                          <Download size={13} />{downloadingId === `ward-${ward.id}` ? 'Loading…' : 'Download'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══ VOTERS ══ */}
      {view === 'voters' && (
        <>
          <div className="bg-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative max-w-sm">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input className="pl-9 w-full border border-slate-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="Search by name or voter ID…" value={voterSearch} onChange={e => setVoterSearch(e.target.value)} />
            </div>
          </div>

          {votersLoading ? <Spinner /> : (
            <>
              {/* Mobile — cards */}
              <div className="flex flex-col gap-3 sm:hidden">
                {filteredVoters.length === 0
                  ? <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-14 text-center text-slate-400 text-sm">
                      {voters.length === 0 ? 'No voters registered for this ward.' : 'No results match your search.'}
                    </div>
                  : filteredVoters.map(voter => <VoterCard key={voter.id} voter={voter} onDelete={handleDeleteVoter} />)
                }
              </div>

              {/* Desktop — table */}
              <div className="hidden sm:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                        <th className="px-5 py-3 text-left font-semibold">Voter ID</th>
                        <th className="px-5 py-3 text-left font-semibold">Name</th>
                        <th className="px-5 py-3 text-center font-semibold">Age</th>
                        <th className="px-5 py-3 text-center font-semibold">Gender</th>
                        <th className="px-5 py-3 text-center font-semibold">Has Voted</th>
                        <th className="px-5 py-3 text-left font-semibold">Added By</th>
                        <th className="px-5 py-3 text-center font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredVoters.length === 0 && (
                        <tr><td colSpan={7} className="py-14 text-center text-slate-400 text-sm">
                          {voters.length === 0 ? 'No voters registered for this ward.' : 'No results match your search.'}
                        </td></tr>
                      )}
                      {filteredVoters.map(voter => (
                        <tr key={voter.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 font-mono text-xs text-slate-400">{voter.voter_id || voter.id}</td>
                          <td className="px-5 py-3 font-semibold text-slate-800">{voter.name}</td>
                          <td className="px-5 py-3 text-center text-slate-600">{voter.age ?? '—'}</td>
                          <td className="px-5 py-3 text-center text-slate-600">{voter.gender ?? '—'}</td>
                          <td className="px-5 py-3 text-center">{voter.has_voted ? <Badge color="green">Yes</Badge> : <Badge color="gray">No</Badge>}</td>
                          <td className="px-5 py-3 text-slate-500">{voter.created_by_name ?? '—'}</td>
                          <td className="px-5 py-3 text-center">
                            <button onClick={() => handleDeleteVoter(voter)} title={voter.has_voted ? 'Cannot delete — voter has voted' : 'Delete voter'}
                              className={`transition-colors ${voter.has_voted ? 'text-slate-300 cursor-not-allowed' : 'text-red-400 hover:text-red-600'}`}>
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredVoters.length > 0 && (
                    <div className="px-5 py-3 border-t border-slate-50 text-xs text-slate-400 text-right">
                      {filteredVoters.length} of {voters.length} voter{voters.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AdminVotersList;