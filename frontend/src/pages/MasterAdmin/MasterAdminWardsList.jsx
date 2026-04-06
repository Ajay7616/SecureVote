import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Modal, Form, Input, Select, message } from "antd";
import {
  Plus, Edit, Trash2, Search, Upload as UploadIcon,
  ChevronLeft, ChevronRight, MapPin, Users, Vote, Building2,
  Loader2, History, CheckCircle2, XCircle, Clock, FileSpreadsheet,
} from "lucide-react";

import { wardService } from "../../services/wardService";
import { electionService } from "../../services/electionService";

import {
  setWards, addWard, updateWard as updateWardAction,
  deleteWard as deleteWardAction, clearSelectedWard,
} from "../../store/slices/wardSlice";

import { MapContainer, TileLayer, FeatureGroup, Polygon, useMap } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-control-geocoder";
import "leaflet-control-geocoder/dist/Control.Geocoder.css";

const { Option } = Select;

/* ─── Map helpers ────────────────────────────────────────────────────────── */
const MapSearchControl = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      const geocoder = L.Control.geocoder({
        defaultMarkGeocode: false,
        placeholder: "Search location...",
        collapsed: false,
        position: "topright",
        geocoder: L.Control.Geocoder.photon({
          nameProperties: ["name", "street", "suburb", "city", "state"],
          urlParameters: { lang: "en", lat: 20.5937, lon: 78.9629, zoom: 10 },
        }),
      }).on("markgeocode", (e) => {
        const { center, bbox } = e.geocode;
        if (bbox) map.fitBounds(L.latLngBounds([bbox.getSouthWest().lat, bbox.getSouthWest().lng], [bbox.getNorthEast().lat, bbox.getNorthEast().lng]), { padding: [20, 20] });
        else map.setView(center, 15);
      }).addTo(map);
      return () => map.removeControl(geocoder);
    }, 300);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

const fmt = (dt) =>
    dt ? new Date(dt).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }) : "—";

const FitBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions?.length) {
      map.fitBounds(L.latLngBounds(positions), { padding: [30, 30] });
      setTimeout(() => map.invalidateSize(), 300);
    }
  }, [positions, map]);
  return null;
};

/* ─── Shared UI ──────────────────────────────────────────────────────────── */
const Badge = ({ children, color = "gray" }) => {
  const map = {
    green:  "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    blue:   "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    orange: "bg-orange-50 text-orange-600 ring-1 ring-orange-200",
    red:    "bg-red-50 text-red-600 ring-1 ring-red-200",
    gray:   "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[color]}`}>{children}</span>;
};

const statusColor = (s = "") => {
  if (s === "Completed") return "green";
  if (s === "Scheduled") return "blue";
  if (s === "Active")    return "orange";
  return "gray";
};

const uploadStatusColor = (s = "") => {
  if (s === "completed")  return "green";
  if (s === "processing") return "blue";
  if (s === "failed")     return "red";
  return "gray";
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

/* ─── Upload Button ──────────────────────────────────────────────────────── */
const UploadButton = ({ ward, onUpload, uploadingWardId, compact = false }) => {
  const isUploading = uploadingWardId === ward.id;
  if (compact) {
    return (
      <label
        className={`relative p-1.5 rounded transition-colors flex items-center justify-center
          ${isUploading ? "text-blue-400 bg-blue-50 cursor-not-allowed" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"}`}
        title={isUploading ? "Uploading…" : "Upload Voter Excel"}
      >
        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <UploadIcon size={14} />}
        <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => onUpload(e, ward)} disabled={isUploading} />
      </label>
    );
  }
  return (
    <label
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors
        ${isUploading ? "text-blue-500 bg-blue-50 cursor-not-allowed" : "text-slate-500 bg-slate-100 hover:bg-slate-200 cursor-pointer"}`}
    >
      {isUploading
        ? <><Loader2 size={12} className="animate-spin flex-shrink-0" /><span>Uploading…</span></>
        : <><UploadIcon size={12} className="flex-shrink-0" /><span>Upload</span></>
      }
      <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => onUpload(e, ward)} disabled={isUploading} />
    </label>
  );
};

/* ─── Upload History Modal ───────────────────────────────────────────────── */
const UploadHistoryModal = ({ open, onClose, ward, electionId }) => {
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!open || !ward) return;
    setLoading(true);
    setHistory([]);
    setExpanded(null);

    wardService
      .getUploadHistory(ward.id, electionId)
      .then((res) => { if (res.success) setHistory(res.data); })
      .catch(() => message.error("Failed to load upload history"))
      .finally(() => setLoading(false));
  }, [open, ward, electionId]);

  const fmt = (dt) =>
    dt ? new Date(dt).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }) : "—";

  const successRate = (row) =>
    row.total_voters > 0
      ? Math.round((row.successful_imports / row.total_voters) * 100)
      : 0;

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <History size={16} className="text-violet-500" />
          <span className="font-semibold text-slate-800">
            Upload History — {ward?.ward_name ?? "Ward"}
            {ward?.ward_number ? ` (Ward ${ward.ward_number})` : ""}
          </span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width="min(860px, 96vw)"
      destroyOnClose
    >
      {loading ? (
        <Spinner />
      ) : history.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
          <FileSpreadsheet size={36} className="text-slate-200" />
          <p className="text-sm font-medium">No uploads yet for this ward.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 mt-1 max-h-[60vh] overflow-y-auto pr-1">
          {history.map((row) => {
            const rate       = successRate(row);
            const isExpanded = expanded === row.id;

            return (
              <div key={row.id} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">

                <div
                  className="flex items-center gap-3 px-4 py-3 bg-white cursor-pointer hover:bg-slate-50 transition-colors select-none"
                  onClick={() => setExpanded(isExpanded ? null : row.id)}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                    <FileSpreadsheet size={15} className="text-violet-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{row.file_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{fmt(row.uploaded_at)}</p>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                    <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                      Total <span className="text-slate-700 font-bold ml-0.5">{row.total_voters}</span>
                    </span>
                    <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                      <CheckCircle2 size={11} /> {row.successful_imports}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full font-medium">
                      <XCircle size={11} /> {row.failed_imports}
                    </span>
                  </div>

                  <Badge color={uploadStatusColor(row.upload_status)}>
                    {row.upload_status}
                  </Badge>

                  <ChevronRight
                    size={14}
                    className={`text-slate-300 flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                  />
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">

                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                        <span className="font-medium">Import success rate</span>
                        <span className="font-bold text-slate-700">{rate}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            rate === 100 ? "bg-emerald-400" : rate > 50 ? "bg-blue-400" : "bg-orange-400"
                          }`}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Total in file", value: row.total_voters,       icon: FileSpreadsheet, color: "text-slate-500"   },
                        { label: "Imported",       value: row.successful_imports, icon: CheckCircle2,    color: "text-emerald-600" },
                        { label: "Failed",         value: row.failed_imports,     icon: XCircle,         color: "text-red-500"     },
                        { label: "Uploaded by",    value: row.uploaded_by_name ?? "—", icon: Users,     color: "text-violet-600"  },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="bg-white rounded-lg px-3 py-2.5 border border-slate-100 shadow-sm">
                          <div className={`flex items-center gap-1.5 mb-1.5 ${color}`}>
                            <Icon size={12} />
                            <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
                          </div>
                          <p className="text-sm font-bold text-slate-700 truncate">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 bg-white rounded-lg px-3 py-2.5 border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                        <Clock size={12} />
                        <span className="text-[10px] font-semibold uppercase tracking-wide">Processed at</span>
                      </div>
                      <p className="text-sm font-medium text-slate-600">{fmt(row.processed_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>{history.length} upload{history.length !== 1 ? "s" : ""} total</span>
          <span>
            {history.reduce((s, r) => s + (r.successful_imports ?? 0), 0)} voters imported across all uploads
          </span>
        </div>
      )}
    </Modal>
  );
};

/* ─── Election Card (mobile) ─────────────────────────────────────────────── */
const ElectionCard = ({ election, onClick }) => (
  <div onClick={onClick} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 cursor-pointer hover:border-blue-200 hover:shadow-md active:scale-[0.99] transition-all">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-800 text-sm leading-snug truncate">{election.title}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {election.election_date ? new Date(election.election_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
        </p>
      </div>
      <Badge color={statusColor(election.status)}>{election.status || "—"}</Badge>
    </div>
    {election.assigned_admins?.length > 0 && (
      <div className="flex flex-wrap gap-1 mb-3">{election.assigned_admins.map(a => <AdminPill key={a.id} name={a.name} />)}</div>
    )}
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: "Wards",      value: election.total_wards ?? "0" },
        { label: "Voters",     value: election.total_registered_voters ?? "0" },
        { label: "Candidates", value: election.candidate_count ?? "0" },
      ].map(({ label, value }) => (
        <div key={label} className="bg-slate-50 rounded-xl px-3 py-2 text-center">
          <p className="text-base font-black text-slate-700">{value}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">{label}</p>
        </div>
      ))}
    </div>
    <div className="flex items-center justify-end mt-3 text-xs text-blue-500 font-semibold gap-1">View Wards <ChevronRight size={13} /></div>
  </div>
);

/* ─── Ward Card (mobile) ─────────────────────────────────────────────────── */
const WardCard = ({ ward, index, onEdit, onDelete, onViewMap, onUpload, uploadingWardId, onHistory }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-semibold">Ward {ward.ward_number}</span>
          <span className="text-[10px] text-slate-300">#{index + 1}</span>
        </div>
        <p className="font-bold text-slate-800 leading-snug">{ward.ward_name}</p>
        {ward.constituency && (
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><MapPin size={10} /> {ward.constituency}</p>
        )}
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2 mb-3">
      <div className="bg-slate-50 rounded-xl px-3 py-2 text-center">
        <p className="text-base font-black text-slate-700">{ward.registered_voters_count ?? "—"}</p>
        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Registered</p>
      </div>
      <div className="bg-slate-50 rounded-xl px-3 py-2 text-center">
        <p className="text-base font-black text-slate-700">{ward.votes_cast_count ?? 0}</p>
        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Votes Cast</p>
      </div>
    </div>
    {ward.created_by_name && (
      <p className="text-xs text-slate-400 mb-3">Created by <span className="text-slate-600 font-medium">{ward.created_by_name}</span></p>
    )}
    <div className="flex items-center gap-2 flex-wrap">
      <button onClick={() => onEdit(ward)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg font-semibold transition-colors"><Edit size={12} /> Edit</button>
      <button onClick={() => onDelete(ward.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 bg-red-50 hover:bg-red-100 rounded-lg font-semibold transition-colors"><Trash2 size={12} /> Delete</button>
      {ward.boundary_geojson && (
        <button onClick={() => onViewMap(ward)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg font-semibold transition-colors"><MapPin size={12} /> Map</button>
      )}
      <UploadButton ward={ward} onUpload={onUpload} uploadingWardId={uploadingWardId} compact={false} />
      <button onClick={() => onHistory(ward)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg font-semibold transition-colors">
        <History size={12} /> History
      </button>
    </div>
  </div>
);

/* ─── Main Component ─────────────────────────────────────────────────────── */
const MasterAdminWardsList = () => {
  const dispatch = useDispatch();
  const { wards } = useSelector((state) => state.ward);

  const [activeElections, setActiveElections] = useState([]);
  const [initLoading, setInitLoading]         = useState(true);
  const [electionLoading, setElectionLoading] = useState(false);

  const [view, setView]                    = useState("elections");
  const [selectedElection, setSelElection] = useState(null);

  const [elecSearch, setElecSearch] = useState("");
  const [wardSearch, setWardSearch] = useState("");

  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [editingWard, setEditingWard]   = useState(null);
  const [polygon, setPolygon]           = useState(null);
  const [separateList, setSeparateList] = useState(false);

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapPolygon, setMapPolygon]         = useState(null);
  const [mapCenter, setMapCenter]           = useState([20.5937, 78.9629]);
  const [uploadingWardId, setUploadingWardId] = useState(null);

  // ── upload history ──
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyWard, setHistoryWard] = useState(null);

  const [form] = Form.useForm();

  /* ── fetch ── */
  const fetchWards = async () => {
    try {
      const res = await wardService.getAllWards();
      if (res.success) dispatch(setWards(res.data));
    } catch { message.error("Failed to fetch wards"); }
  };

  const fetchActiveElections = async () => {
    try {
      setElectionLoading(true);
      const res = await electionService.getActiveElections();
      if (res.success) setActiveElections(res.data);
    } catch { message.error("No active election found"); }
    finally { setElectionLoading(false); setInitLoading(false); }
  };

  useEffect(() => { fetchWards(); fetchActiveElections(); }, []);

  useEffect(() => {
    if (activeElections.length === 1) form.setFieldsValue({ election_id: activeElections[0].id });
  }, [activeElections]);

  /* ── navigation ── */
  const handleElectionClick = (election) => { setSelElection(election); setWardSearch(""); setView("wards"); };
  const goToElections = () => { setView("elections"); setSelElection(null); setElecSearch(""); };

  /* ── map view ── */
  const handleViewMap = (ward) => {
    if (ward.boundary_geojson) {
      setMapPolygon(ward.boundary_geojson);
      const coords = ward.boundary_geojson.coordinates[0][0];
      setMapCenter([coords[1], coords[0]]);
      setIsMapModalOpen(true);
    } else {
      message.info("No boundary defined for this ward.");
    }
  };

  /* ── history ── */
  const handleHistory = (ward) => { setHistoryWard(ward); setHistoryOpen(true); };

  /* ── modal handlers ── */
  const showAddModal = () => {
    setEditingWard(null); setPolygon(null); setSeparateList(false); form.resetFields();
    if (selectedElection) form.setFieldsValue({ election_id: selectedElection.id });
    setIsModalOpen(true);
  };

  const showEditModal = (ward) => {
    setEditingWard(ward); setSeparateList(ward.separate_voter_list); form.setFieldsValue(ward);
    if (ward.boundary_polygon) setPolygon(ward.boundary_polygon);
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false); setEditingWard(null); setPolygon(null); setSeparateList(false);
    form.resetFields(); dispatch(clearSelectedWard());
  };

  const handleCreated = (e) => setPolygon(e.layer.toGeoJSON().geometry);
  const handleEdited  = (e) => e.layers.eachLayer((l) => setPolygon(l.toGeoJSON().geometry));

  /* ── submit ── */
  const handleSubmit = async (values) => {
    try {
      const payload = { ...values, boundary_polygon: values.separate_voter_list ? polygon : null };
      if (editingWard) {
        const res = await wardService.updateWard({ id: editingWard.id, ...payload });
        if (res.success) { dispatch(updateWardAction(res.data)); message.success("Ward updated successfully"); }
      } else {
        const res = await wardService.createWard(payload);
        if (res.success) { dispatch(addWard(res.data)); message.success("Ward added successfully"); }
      }
      handleCancel(); fetchWards();
    } catch (err) { message.error(err.response?.data?.error || "Failed to save ward"); }
  };

  /* ── delete ── */
  const handleDelete = (id) => {
    Modal.confirm({
      title: "Delete Ward", content: "Are you sure?", okType: "danger",
      onOk: async () => {
        try {
          const res = await wardService.deleteWard(id);
          if (res.success) { dispatch(deleteWardAction(id)); message.success("Ward deleted successfully"); }
        } catch { message.error("Delete failed"); }
      },
    });
  };

  /* ── upload ── */
  const handleUpload = async (e, ward) => {
    try {
      const file = e.target.files[0];
      if (!file) return;
      const electionId = ward.election_id ?? selectedElection?.id;
      if (!electionId) return message.warning("Could not determine election for this ward.");
      setUploadingWardId(ward.id);
      await wardService.uploadVoterList(ward.id, electionId, file);
      message.success("Voter list uploaded successfully!");
      e.target.value = null;
      fetchWards();
      fetchActiveElections();
    } catch (err) {
      message.error("Upload failed: " + (err.response?.data?.error || err.message));
    } finally {
      setUploadingWardId(null);
    }
  };

  /* ── filtered ── */
  const filteredElections = activeElections.filter(e =>
    !elecSearch ||
    e.title?.toLowerCase().includes(elecSearch.toLowerCase()) ||
    e.status?.toLowerCase().includes(elecSearch.toLowerCase())
  );

  const electionWards = wards.filter(w => w.election_id === selectedElection?.id);
  const filteredWards = electionWards.filter(w =>
    !wardSearch ||
    w.ward_name?.toLowerCase().includes(wardSearch.toLowerCase()) ||
    w.constituency?.toLowerCase().includes(wardSearch.toLowerCase())
  );

  const breadcrumbItems = [
    { label: "Elections", onClick: view !== "elections" ? goToElections : null },
    ...(selectedElection ? [{ label: selectedElection.title }] : []),
  ];

  return (
    <div className="space-y-4 sm:space-y-5" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

      <div className="bg-white px-4 sm:px-6 py-4 sm:py-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {view !== "elections" && (
            <button onClick={goToElections} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors flex-shrink-0">
              <ChevronLeft size={16} /> <span className="hidden sm:inline">Back</span>
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-slate-800 tracking-tight truncate">
              {view === "elections" ? "Wards Management" : (
                <><span className="hidden sm:inline">Wards — </span><span className="text-blue-600 truncate">{selectedElection?.title}</span></>
              )}
            </h1>
            <div className="mt-0.5 hidden sm:block"><Breadcrumb items={breadcrumbItems} /></div>
          </div>
        </div>
        {view === "wards" && (
          <button onClick={showAddModal} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm rounded-lg font-medium transition-colors flex-shrink-0">
            <Plus size={14} /> <span>Add Ward</span>
          </button>
        )}
      </div>

      {view === "elections" && (
        <>
          <div className="bg-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative max-w-sm">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                className="pl-9 w-full border border-slate-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Search elections…" value={elecSearch} onChange={e => setElecSearch(e.target.value)}
              />
            </div>
          </div>

          {initLoading ? <Spinner /> : (
            <>
              <div className="flex flex-col gap-3 sm:hidden">
                {filteredElections.length === 0
                  ? <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-14 text-center text-slate-400 text-sm">No elections found.</div>
                  : filteredElections.map(e => <ElectionCard key={e.id} election={e} onClick={() => handleElectionClick(e)} />)
                }
              </div>
              <div className="hidden sm:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                        <th className="px-5 py-3 text-left font-semibold">Election Title</th>
                        <th className="px-5 py-3 text-center font-semibold">Assignee</th>
                        <th className="px-5 py-3 text-center font-semibold">Status</th>
                        <th className="px-5 py-3 text-center font-semibold">Wards</th>
                        <th className="px-5 py-3 text-center font-semibold">Voters</th>
                        <th className="px-5 py-3 text-center font-semibold">Candidates</th>
                        <th className="px-5 py-3 text-left font-semibold">Election Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredElections.length === 0 && (
                        <tr><td colSpan={7} className="py-14 text-center text-slate-400 text-sm">No elections found.</td></tr>
                      )}
                      {filteredElections.map(election => (
                        <tr key={election.id} onClick={() => handleElectionClick(election)} className="cursor-pointer hover:bg-blue-50 transition-colors group">
                          <td className="px-5 py-3 font-semibold text-slate-800 group-hover:text-blue-700">{election.title}</td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {election.assigned_admins?.length > 0
                                ? election.assigned_admins.map(a => <AdminPill key={a.id} name={a.name} />)
                                : <span className="text-slate-300 text-xs">—</span>}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center"><Badge color={statusColor(election.status)}>{election.status || "—"}</Badge></td>
                          <td className="px-5 py-3 text-center text-slate-600">{election.total_wards ?? "0"}</td>
                          <td className="px-5 py-3 text-center text-slate-600">{election.total_registered_voters ?? "0"}</td>
                          <td className="px-5 py-3 text-center text-slate-600">{election.candidate_count ?? "0"}</td>
                          <td className="px-5 py-3 text-slate-500">
                            {election.election_date ? new Date(election.election_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
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

      {view === "wards" && (
        <>
          <div className="bg-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative max-w-sm">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                className="pl-9 w-full border border-slate-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Search by ward name or constituency…" value={wardSearch} onChange={e => setWardSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:hidden">
            {filteredWards.length === 0
              ? <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-14 text-center text-slate-400 text-sm">No wards found for this election.</div>
              : filteredWards.map((ward, index) => (
                  <WardCard key={ward.id} ward={ward} index={index}
                    onEdit={showEditModal} onDelete={handleDelete} onViewMap={handleViewMap}
                    onUpload={handleUpload} uploadingWardId={uploadingWardId} onHistory={handleHistory}
                  />
                ))
            }
          </div>

          <div className="hidden sm:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                    <th className="px-5 py-3 text-center font-semibold">S.No.</th>
                    <th className="px-5 py-3 text-center font-semibold">Ward No.</th>
                    <th className="px-5 py-3 text-left font-semibold">Ward Name</th>
                    <th className="px-5 py-3 text-left font-semibold">Constituency</th>
                    <th className="px-5 py-3 text-center font-semibold">Reg. Voters</th>
                    <th className="px-5 py-3 text-center font-semibold">Votes Cast</th>
                    <th className="px-5 py-3 text-left font-semibold">Created By</th>
                    <th className="px-5 py-3 text-left font-semibold">Updated By</th>
                    <th className="px-5 py-3 text-left font-semibold">Updated By</th>
                    <th className="px-5 py-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredWards.length === 0 && (
                    <tr><td colSpan={8} className="py-14 text-center text-slate-400 text-sm">No wards found for this election.</td></tr>
                  )}
                  {filteredWards.map((ward, index) => (
                    <tr key={ward.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-center text-slate-400 text-xs">{index + 1}</td>
                      <td className="px-5 py-3 text-center font-mono text-xs text-slate-500">{ward.ward_number}</td>
                      <td className="px-5 py-3 font-semibold text-slate-800">{ward.ward_name}</td>
                      <td className="px-5 py-3 text-slate-600">{ward.constituency ?? "—"}</td>
                      <td className="px-5 py-3 text-center text-slate-600">{ward.registered_voters_count ?? "—"}</td>
                      <td className="px-5 py-3 text-center text-slate-600">{ward.votes_cast_count ?? 0}</td>
                      <td className="px-5 py-3 text-slate-500">{ward.created_by_name ?? "—"}</td>
                      <td className="px-5 py-3 text-slate-500">{ward.updated_by_name ?? "—"}</td>
                      <td className="px-5 py-3 text-slate-500">{fmt(ward.updated_at) ?? "—"}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => showEditModal(ward)} className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors" title="Edit"><Edit size={14} /></button>
                          <button onClick={() => handleDelete(ward.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete"><Trash2 size={14} /></button>
                          {ward.boundary_geojson && (
                            <button onClick={() => handleViewMap(ward)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors font-medium">Map</button>
                          )}
                          <UploadButton ward={ward} onUpload={handleUpload} uploadingWardId={uploadingWardId} compact={true} />
                          <button
                            onClick={() => handleHistory(ward)}
                            className="p-1.5 text-violet-500 hover:text-violet-700 hover:bg-violet-50 rounded transition-colors"
                            title="Upload History"
                          >
                            <History size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredWards.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-50 text-xs text-slate-400 text-right">
                  {filteredWards.length} ward{filteredWards.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <Modal
        title={<span className="font-semibold text-slate-800">{editingWard ? "Edit Ward" : "Add Ward"}</span>}
        open={isModalOpen} onCancel={handleCancel} footer={null} width="min(800px, 95vw)"
      >
        <Form layout="vertical" form={form} onFinish={handleSubmit}>
          <Form.Item name="election_id" label="Election" rules={[{ required: true, message: "Please select an election" }]}>
            <Select placeholder="Select Election" loading={electionLoading}>
              {activeElections.map(e => <Option key={e.id} value={e.id}>{e.title}</Option>)}
            </Select>
          </Form.Item>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Form.Item name="ward_number" label="Ward Number" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="ward_name" label="Ward Name" rules={[{ required: true }]}><Input /></Form.Item>
          </div>
          <Form.Item name="constituency" label="Constituency"><Input /></Form.Item>
          <Form.Item name="separate_voter_list" label="Ward Mapping">
            <Select onChange={(val) => { setSeparateList(val); if (!val) setPolygon(null); }}>
              <Option value={true}>Yes</Option>
              <Option value={false}>No</Option>
            </Select>
          </Form.Item>
          {separateList && (
            <div className="mb-4">
              <label className="block font-medium mb-2 text-sm">Draw Ward Boundary</label>
              <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: 300 }}>
                <MapSearchControl />
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FeatureGroup>
                  <EditControl position="topright" onCreated={handleCreated} onEdited={handleEdited}
                    draw={{ rectangle: false, circle: false, circlemarker: false, marker: false, polyline: false }}
                  />
                </FeatureGroup>
              </MapContainer>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={handleCancel} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              {editingWard ? "Update Ward" : "Add Ward"}
            </button>
          </div>
        </Form>
      </Modal>

      <Modal title="Ward Boundary Map" open={isMapModalOpen} onCancel={() => setIsMapModalOpen(false)} footer={null} width="min(700px, 95vw)" destroyOnClose>
        {mapPolygon && (() => {
          const positions = mapPolygon.coordinates[0].map(c => [c[1], c[0]]);
          return (
            <div style={{ height: 400, width: "100%" }}>
              <MapContainer center={mapCenter} zoom={14} style={{ height: "100%", width: "100%" }}>
                <MapSearchControl />
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                <FitBounds positions={positions} />
                <Polygon positions={positions} color="blue" />
              </MapContainer>
            </div>
          );
        })()}
      </Modal>

      <UploadHistoryModal
        open={historyOpen}
        onClose={() => { setHistoryOpen(false); setHistoryWard(null); }}
        ward={historyWard}
        electionId={selectedElection?.id}
      />
    </div>
  );
};

export default MasterAdminWardsList;