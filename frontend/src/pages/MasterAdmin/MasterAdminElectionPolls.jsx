import React, { useEffect, useState, useCallback } from "react";
import { message, Modal, Spin } from "antd";
import {
  ChevronRight,
  ChevronLeft,
  Search,
  Shield,
  ShieldCheck,
  ShieldX,
  Trophy,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  Vote,
  TrendingUp,
  Hash,
  BadgeCheck,
  AlertCircle,
  BarChart2,
} from "lucide-react";
import dayjs from "dayjs";
import { History, FileSpreadsheet } from "lucide-react";
import { electionService } from "../../services/electionService";
import { wardService } from "../../services/wardService";
import { voteService } from "../../services/voteService";
import { candidateService } from "../../services/candidateService";


// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
const statusColorMap = {
  Completed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Active: "bg-orange-50 text-orange-600 ring-1 ring-orange-200",
  Scheduled: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
};

const statusDotMap = {
  Completed: "bg-emerald-500",
  Active: "bg-orange-500",
  Scheduled: "bg-blue-500",
};



const AdminPill = ({ name }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 ring-1 ring-violet-200">
    {name}
  </span>
);

const getStatusClasses = (status = "") =>
  statusColorMap[status] ?? "bg-slate-100 text-slate-500 ring-1 ring-slate-200";

const getStatusDot = (status = "") =>
  statusDotMap[status] ?? "bg-slate-400";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const rankMeta = (rank) => {
  if (rank === 1) return { emoji: "🥇", cls: "text-yellow-500" };
  if (rank === 2) return { emoji: "🥈", cls: "text-slate-400" };
  if (rank === 3) return { emoji: "🥉", cls: "text-amber-600" };
  return { emoji: `#${rank}`, cls: "text-slate-400 font-semibold text-sm" };
};

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

const barColor = (rank) => {
  if (rank === 1) return "from-yellow-400 to-amber-500";
  if (rank === 2) return "from-slate-300 to-slate-400";
  if (rank === 3) return "from-amber-500 to-amber-600";
  return "from-blue-400 to-blue-500";
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED MICRO-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const Spinner = ({ size = "lg" }) => (
  <div className={`flex justify-center ${size === "lg" ? "py-20" : "py-6"}`}>
    <div
      className={`${
        size === "lg" ? "w-8 h-8" : "w-5 h-5"
      } border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin`}
    />
  </div>
);

const Badge = ({ children, status }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusClasses(
      status
    )}`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${getStatusDot(status)}`}
    />
    {children}
  </span>
);

const Breadcrumb = ({ items }) => (
  <div className="flex items-center gap-1 text-xs text-slate-400 flex-wrap">
    {items.map((item, i) => (
      <React.Fragment key={i}>
        {i > 0 && <ChevronRight size={12} className="text-slate-300" />}
        {item.onClick ? (
          <button
            onClick={item.onClick}
            className="text-blue-500 hover:text-blue-700 font-medium transition-colors"
          >
            {item.label}
          </button>
        ) : (
          <span className="text-slate-700 font-semibold">{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </div>
);

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

const SearchBar = ({ value, onChange, placeholder }) => (
  <div className="relative max-w-sm">
    <Search
      size={14}
      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
    />
    <input
      className="pl-9 pr-4 w-full border border-slate-200 rounded-lg py-2 text-sm
                 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white
                 placeholder:text-slate-400 text-slate-700"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

const EmptyState = ({ icon: Icon, title, sub }) => (
  <div className="py-20 flex flex-col items-center gap-3 text-center">
    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
      <Icon size={24} className="text-slate-400" />
    </div>
    <p className="font-semibold text-slate-600">{title}</p>
    {sub && <p className="text-sm text-slate-400 max-w-xs">{sub}</p>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// HASH VERIFICATION MODAL
// ─────────────────────────────────────────────────────────────────────────────
const HashVerifyModal = ({ hash, voterName, onClose }) => {
  const [state, setState] = useState("loading"); // loading | success | fail | error
  const [voteData, setVoteData] = useState(null);
  const [errMsg, setErrMsg] = useState("");

  const runVerify = useCallback(async () => {
    setState("loading");
    setVoteData(null);
    setErrMsg("");
    try {
      const res = await voteService.verifyVoteOnBlockchain(hash);
      if (res.success) {
        setVoteData(res.voteData);
        setState(res.verified ? "success" : "fail");
      } else {
        setErrMsg(res.error || "Verification failed");
        setState("error");
      }
    } catch (err) {
      setErrMsg(err?.response?.data?.error || err.message || "Network error");
      setState("error");
    }
  }, [hash]);

  useEffect(() => {
    runVerify();
  }, [runVerify]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Modal header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash size={18} className="text-blue-600" />
            <h3 className="font-bold text-slate-800">Blockchain Verification</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Voter info */}
          {voterName && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Users size={14} className="text-slate-400" />
              <span>Verifying vote by <strong>{voterName}</strong></span>
            </div>
          )}

          {/* Hash chip */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mb-1">
              Blockchain Hash
            </p>
            <p className="font-mono text-xs text-slate-700 break-all leading-relaxed">
              {hash}
            </p>
          </div>

          {/* Status */}
          {state === "loading" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              <p className="text-sm text-slate-500 font-medium">
                Contacting blockchain…
              </p>
            </div>
          )}

          {state === "success" && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <ShieldCheck
                  size={22}
                  className="text-emerald-500 flex-shrink-0 mt-0.5"
                />
                <div>
                  <p className="font-bold text-emerald-700">Vote Verified ✓</p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    This vote is recorded and verified on the blockchain.
                  </p>
                </div>
              </div>
              {voteData && (
                <div className="rounded-xl border border-slate-100 divide-y divide-slate-100 text-sm overflow-hidden">
                  {[
                    // ["Vote ID", voteData.voteId],
                    // ["Election ID", voteData.electionId],
                    [
                      "Voted At",
                      voteData.votedAt ? fmtDateTime(voteData.votedAt) : null,
                    ],
                    [
                      "Tx Hash",
                      voteData.transactionHash ? (
                        <span className="font-mono text-xs break-all">
                          {voteData.transactionHash}
                        </span>
                      ) : null,
                    ],
                  ]
                    .filter(([, v]) => v)
                    .map(([label, val]) => (
                      <div
                        key={label}
                        className="flex justify-between gap-4 px-4 py-2.5"
                      >
                        <span className="text-slate-500 flex-shrink-0">
                          {label}
                        </span>
                        <span className="text-slate-800 font-medium text-right">
                          {val}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {state === "fail" && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <AlertCircle
                size={22}
                className="text-amber-500 flex-shrink-0 mt-0.5"
              />
              <div>
                <p className="font-bold text-amber-700">Not Found on Blockchain</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  This hash could not be verified on the blockchain.
                </p>
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <ShieldX
                size={22}
                className="text-red-500 flex-shrink-0 mt-0.5"
              />
              <div>
                <p className="font-bold text-red-700">Verification Failed</p>
                <p className="text-xs text-red-500 mt-0.5">{errMsg}</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex justify-end gap-2">
          {(state === "fail" || state === "error") && (
            <button
              onClick={runVerify}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Retry
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// VOTES PANEL  (slide-in drawer showing votes for a candidate)
// ─────────────────────────────────────────────────────────────────────────────
const VotesPanel = ({ candidate, election, ward, onClose }) => {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [verifyTarget, setVerifyTarget] = useState(null); // { hash, name }

  useEffect(() => {
    const fetchVoters = async () => {
      setLoading(true);
      try {
        const res = await voteService.getElectionResults(election.id, ward.id);
        if (res.success) setVoters(res.results || []);
        else message.error("Failed to load voters");
      } catch {
        message.error("Failed to load voters");
      } finally {
        setLoading(false);
      }
    };
    fetchVoters();
  }, [ward.id, election.id]);

  const candidateVoters = voters.filter(
  (v) => v.candidate_id === candidate.id
  );

  // Step 2: apply search
  const filtered = candidateVoters.filter(
    (v) =>
      !search ||
      v.voter_name?.toLowerCase().includes(search.toLowerCase()) ||
      v.voter_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Vote size={18} className="text-blue-600" />
              <h3 className="font-bold text-slate-800 text-base">
                Votes Cast
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors text-xl"
            >
              ×
            </button>
          </div>

          {/* Candidate summary */}
          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
              {candidate.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 truncate">
                {candidate.name}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {candidate.party && (
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {candidate.party}
                  </span>
                )}
                <span className="text-xs text-blue-600 font-semibold">
                  {Number(candidate.total_votes || candidate.votes || 0).toLocaleString()} votes
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-50">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by voter ID or name…"
          />
        </div>

        {/* Voter list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <Spinner size="sm" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No voters found"
              sub="No vote records match your search."
            />
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map((voter, idx) => (
                <div
                  key={voter.id || voter.voter_id || idx}
                  className="px-6 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-sm font-bold text-slate-600 flex-shrink-0">
                        {(voter.name || voter.voter_name || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">
                          {voter.name || voter.voter_name || "—"}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">
                          ID: {voter.voter_id || "—"}
                        </p>
                        {voter.voted_at && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {fmtDateTime(voter.voted_at)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Verify Hash button */}
                    {voter.blockchain_hash ? (
                      <button
                        onClick={() =>
                          setVerifyTarget({
                            hash: voter.blockchain_hash,
                            name: voter.name || voter.voter_name,
                          })
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700
                                   rounded-lg text-xs font-semibold transition-colors flex-shrink-0 border border-blue-100"
                      >
                        <Shield size={11} />
                        Verify Hash
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300 flex-shrink-0">
                        No hash
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer count */}
        {!loading && (
          <div className="px-6 py-3 border-t border-slate-100 text-xs text-slate-400 text-right bg-slate-50">
            {filtered.length} voter{filtered.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Hash verify modal */}
      {verifyTarget && (
        <HashVerifyModal
          hash={verifyTarget.hash}
          voterName={verifyTarget.name}
          onClose={() => setVerifyTarget(null)}
        />
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE RANKINGS VIEW
// ─────────────────────────────────────────────────────────────────────────────
const CandidateView = ({ election, ward, onBack, onBackToElections }) => {
  const [candidates, setCandidates] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCandidate, setActiveCandidate] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch candidates with their vote counts
        const [candRes, resultsRes] = await Promise.allSettled([
          candidateService.getAdminCandidateByElectionAndWard(
            election.id,
            ward.id
          ),
          voteService.getElectionResults(election.id, ward.id),
        ]);

        let candidateList = [];

        if (
          candRes.status === "fulfilled" &&
          candRes.value.success
        ) {
          candidateList = candRes.value.data || [];
        }

        // Merge vote percentage from results if available
        if (
          resultsRes.status === "fulfilled" &&
          resultsRes.value.success
        ) {
          const resultMap = {};
          (resultsRes.value.results || []).forEach((r) => {
            resultMap[r.id] = r;
          });
          candidateList = candidateList.map((c) => ({
            ...c,
            vote_percentage: resultMap[c.id]?.vote_percentage ?? null,
          }));
          setTotalVotes(resultsRes.value.totalVotes || 0);
        }

        // Sort by total_votes DESC
        candidateList.sort(
          (a, b) =>
            Number(b.total_votes || b.votes || 0) -
            Number(a.total_votes || a.votes || 0)
        );

        setCandidates(candidateList);
      } catch {
        message.error("Failed to fetch candidate data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [election.id, ward.id]);

  const filtered = candidates.filter(
    (c) =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.party?.toLowerCase().includes(search.toLowerCase())
  );

  const maxVotes = Number(candidates[0]?.total_votes || candidates[0]?.votes || 1);

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="bg-white px-6 py-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                <ChevronLeft size={16} /> Back
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                  Candidate Rankings
                </h1>
                <Breadcrumb
                  items={[
                    { label: "Elections", onClick: onBackToElections },
                    { label: election.title, onClick: onBack },
                    { label: ward.ward_name },
                  ]}
                />
              </div>
            </div>
            {/* Stat chips */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
                <BarChart2 size={15} className="text-blue-500" />
                <div>
                  <p className="text-xs text-blue-500 font-medium leading-none mb-0.5">
                    Total Votes
                  </p>
                  <p className="text-base font-black text-blue-700 leading-none">
                    {totalVotes.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <Users size={15} className="text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400 font-medium leading-none mb-0.5">
                    Candidates
                  </p>
                  <p className="text-base font-black text-slate-700 leading-none">
                    {candidates.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search candidates by name or party…"
          />
        </div>

        {/* Winner spotlight */}
        {!loading && candidates.length > 0 && !search && (
          <div className="bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-6 py-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                {candidates[0].symbol ? (
                  // ✅ Image is standalone, not inside the gradient div
                  <img
                    src={`http://localhost:5000${candidates[0].symbol}`}
                    alt={candidates[0].name}
                    className="w-16 h-16 rounded-full object-cover shadow-lg"
                  />
                ) : (
                  // ✅ Gradient div only renders when there's no image
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                    {candidates[0].name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 text-xl">🥇</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy size={14} className="text-amber-500" />
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                    Winner
                  </span>
                </div>
                <p className="text-xl font-black text-slate-800 truncate">
                  {candidates[0].name}
                </p>
                {candidates[0].party && (
                  <p className="text-sm text-slate-500">
                    {candidates[0].party}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-3xl font-black text-slate-800">
                  {Number(
                    candidates[0].total_votes || candidates[0].votes || 0
                  ).toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 font-medium">votes</p>
                {candidates[0].vote_percentage != null && (
                  <p className="text-sm font-bold text-amber-600">
                    {candidates[0].vote_percentage}%
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Candidate table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <Spinner />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No candidates found"
              sub="Try adjusting your search."
            />
          ) : (
            <>
              <div className="divide-y divide-slate-50">
                {filtered.map((candidate, idx) => {
                  const rankIndex = candidates.indexOf(candidate);
                  const rank = rankIndex + 1;
                  const { emoji, cls } = rankMeta(rank);
                  const votes = Number(
                    candidate.total_votes || candidate.votes || 0
                  );
                  const pct = maxVotes > 0 ? (votes / maxVotes) * 100 : 0;

                  return (
                    <div
                      key={candidate.id || idx}
                      onClick={() => setActiveCandidate(candidate)}
                      className="px-6 py-4 hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        {/* Rank */}
                        <div
                          className={`w-10 text-center text-lg flex-shrink-0 ${cls}`}
                        >
                          {emoji}
                        </div>

                        {/* Avatar */}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all
                          ${
                            rank === 1
                              ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white"
                              : rank === 2
                              ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white"
                              : rank === 3
                              ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white"
                              : "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 group-hover:from-blue-100 group-hover:to-blue-200 group-hover:text-blue-700"
                          }`}
                        >
                          {candidate.symbol ? (
                              <img
                                src={`http://localhost:5000${candidate.symbol}`}
                                alt={candidate.name}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              candidate.name?.[0]?.toUpperCase()
                            )
                          }
                        </div>

                        {/* Info + bar */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                              {candidate.name}
                            </p>
                            {candidate.party && (
                              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                {candidate.party}
                              </span>
                            )}
                          </div>
                          {/* Vote bar */}
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${barColor(rank)} transition-all duration-700`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Vote count */}
                        <div className="text-right flex-shrink-0 min-w-[80px]">
                          <p className="text-lg font-black text-slate-800">
                            {votes.toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-400 font-medium">
                            {candidate.vote_percentage != null
                              ? `${candidate.vote_percentage}%`
                              : "votes"}
                          </p>
                        </div>

                        {/* Chevron */}
                        <ChevronRight
                          size={16}
                          className="text-slate-300 group-hover:text-blue-400 transition-colors flex-shrink-0"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-6 py-3 border-t border-slate-50 bg-slate-50 text-xs text-slate-400 text-right">
                Click a candidate to view votes
              </div>
            </>
          )}
        </div>
      </div>

      {/* Votes drawer */}
      {activeCandidate && (
        <VotesPanel
          candidate={activeCandidate}
          election={election}
          ward={ward}
          onClose={() => setActiveCandidate(null)}
        />
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// WARDS VIEW
// ─────────────────────────────────────────────────────────────────────────────
const WardsView = ({ election, wards, onWardSelect, onBack }) => {
  const [search, setSearch] = useState("");

  const electionWards = wards || [];  
  const filtered = electionWards.filter(
    (w) =>
      !search ||
      w.ward_name?.toLowerCase().includes(search.toLowerCase()) ||
      w.constituency?.toLowerCase().includes(search.toLowerCase()) ||
      String(w.ward_number || "").includes(search)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white px-6 py-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <ChevronLeft size={16} /> Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Wards —{" "}
              <span className="text-blue-600">{election.title}</span>
            </h1>
            <Breadcrumb
              items={[
                { label: "Elections", onClick: onBack },
                { label: election.title },
              ]}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Badge status={election.status}>{election.status || "—"}</Badge>
          <span className="text-slate-300">•</span>
          <span>
            <strong className="text-slate-700">{electionWards.length}</strong>{" "}
            ward{electionWards.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by ward name or constituency…"
        />
      </div>

      {/* Ward grid */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Vote}
            title="No wards found"
            sub="No wards are assigned to this election yet."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((ward) => (
              <button
                key={ward.id}
                onClick={() => onWardSelect(ward)}
                className="p-5 text-left border-b border-r border-slate-50 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-mono bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 px-2 py-0.5 rounded-md transition-colors font-semibold">
                    Ward {ward.ward_number}
                  </span>
                  <TrendingUp
                    size={14}
                    className="text-slate-300 group-hover:text-blue-400 transition-colors mt-0.5"
                  />
                </div>
                <p className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors mb-1 leading-snug text-base">
                  {ward.ward_name}
                </p>
                {ward.constituency && (
                  <p className="text-xs text-slate-400 mb-3">
                    {ward.constituency}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users size={11} className="text-slate-400" />
                    {ward.registered_voters_count ?? "—"} registered
                  </span>
                  <span className="flex items-center gap-1">
                    <Vote size={11} className="text-slate-400" />
                    {ward.votes_cast_count ?? 0} cast
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ELECTIONS VIEW
// ─────────────────────────────────────────────────────────────────────────────
const ElectionsView = ({ elections, loading, onElectionSelect, fetchHistory, historyData, historyLoading, historyOpen, selectedElectionModal, expanded, setExpanded, setHistoryOpen }) => {
  const [search, setSearch] = useState("");

  const filtered = elections.filter(
    (e) =>
      !search ||
      e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.status?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="bg-white px-6 py-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <BadgeCheck size={22} className="text-blue-600" />
            Election Polls
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Select an election to explore wards, candidates, and votes
          </p>
        </div>
        <span className="text-sm text-slate-400">
          <strong className="text-slate-600">{elections.length}</strong>{" "}
          election{elections.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Search */}
      <div className="bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search elections by title or status…"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BadgeCheck}
            title="No elections found"
            sub="No election data is available right now."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                  {[
                    ["Election Title", "left"],
                    ["Assignees", "center"],
                    ["Status", "center"],
                    ["Wards", "center"],
                    ["Voters", "center"],
                    ["Candidates", "center"],
                    ["Votes Cast", "center"],
                    ["Election Date", "center"],
                    ["Created By", "center"],
                    ["Last Updated By", "center"],
                    ["Last Updated At", "center"],
                    ["Action", "left"]
                  ].map(([label, align]) => (
                    <th
                      key={label}
                      className={`px-5 py-3 text-${align} font-semibold`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((election) => (
                  <tr
                    key={election.id}
                    onClick={() => onElectionSelect(election)}
                    className="cursor-pointer hover:bg-blue-50 transition-colors group"
                  >
                    <td className="px-5 py-3.5 font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                      {election.title}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {election.assigned_admins && election.assigned_admins.length > 0 ? (
                          election.assigned_admins.map((admin) => (
                            <AdminPill key={admin.id} name={admin.name} />
                          ))
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge status={election.status}>
                        {election.status || "—"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-600">
                      {election.ward_count ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-600">
                      {election.voter_count ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-600">
                      {election.candidate_count ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-600">
                      {election.vote_count ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-500">
                      {fmtDate(election.election_date)}
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-600">
                      {election.created_by_name}
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-600">
                      {election.updated_by_name}
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-600">
                      {fmtDate(election.updated_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-3">
                        <button
                           onClick={(e) => {
                              e.stopPropagation();
                              fetchHistory(election);
                            }}
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
            <Modal
              title={
                <div className="flex items-center gap-2">
                  <History size={16} className="text-violet-500" />
                  <span className="font-semibold text-slate-800">
                    Upload History — {selectedElectionModal?.title || "Election"}
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
        )}
      </div>
    </div>
  );
};


const MasterAdminElectionPolls = () => {
  // Data
  const [allElections, setAllElections] = useState([]);
  const [allWards, setAllWards] = useState([]);
  const [initLoading, setInitLoading] = useState(true);

  // Navigation state: 'elections' | 'wards' | 'candidates'
  const [view, setView] = useState("elections");
  const [selectedElection, setSelectedElection] = useState(null);
  const [selectedWard, setSelectedWard] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedElectionModal, setSelectedElectionModal] = useState(null);
  const [expanded, setExpanded] = useState(null);
  

  /* ── Fetch on mount ── */
  const fetchAllElections = async () => {
    try {
      const res = await electionService.getCompletedElections();
      if (res.success) {
        const elections = res.data || [];
        setAllElections(elections);

        // Extract wards from elections
        const wards = elections.flatMap(election => election.wards || []);
        setAllWards(wards);
      } else {
        message.error("Failed to fetch elections");
      }
    } catch {
      message.error("Failed to fetch elections");
    } finally {
      setInitLoading(false);
    }
  };

  const fetchHistory = async (election) => {
    try {
      setHistoryLoading(true);
      setSelectedElectionModal(election);

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

  useEffect(() => {
    fetchAllElections();
  }, []);

  /* ── Navigation helpers ── */
  const goToElections = () => {
    setView("elections");
    setSelectedElection(null);
    setSelectedWard(null);
  };

  const goToWards = (election) => {
    setSelectedElection(election);
    setSelectedWard(null);
    setView("wards");
  };

  const goToCandidates = (ward) => {
    setSelectedWard(ward);
    setView("candidates");
  };

  /* ── Render ── */
  return (
    <div
      className="min-h-screen bg-slate-50 p-5"
      style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}
    >
      <div className="max-w-6xl mx-auto">
        {view === "elections" && (
          <ElectionsView
            elections={allElections}
            loading={initLoading}
            onElectionSelect={goToWards}
            fetchHistory={fetchHistory}
            historyData={historyData}
            historyOpen={historyOpen}
            historyLoading={historyLoading}
            selectedElectionModal={{selectedElectionModal}}
            expanded={expanded}
            setExpanded={setExpanded}
            setHistoryOpen={setHistoryOpen}
          />
        )}

        {view === "wards" && selectedElection && (
          <WardsView
            election={selectedElection}
            wards={selectedElection.wards || []}
            onWardSelect={goToCandidates}
            onBack={goToElections}
          />
        )}

        {view === "candidates" && selectedElection && selectedWard && (
          <CandidateView
            election={selectedElection}
            ward={selectedWard}
            onBack={() => goToWards(selectedElection)}
            onBackToElections={goToElections}
          />
        )}
      </div>
    </div>
  );
};

export default MasterAdminElectionPolls;