import React, { useState, useEffect } from "react";
import { 
  Database, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  FileText, 
  ArrowRight, 
  Cpu, 
  Layers, 
  X, 
  Check, 
  Download,
  Activity,
  Zap,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { RailSyncAPI, ImportBatchRecord, ImportBatchResponse } from "../lib/api";

interface DataPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataImported?: () => void;
}

export const DataPipelineModal: React.FC<DataPipelineModalProps> = ({
  isOpen,
  onClose,
  onDataImported
}) => {
  const [activeTab, setActiveTab] = useState<"import" | "lineage" | "datasets">("import");
  const [selectedSource, setSelectedSource] = useState<"TMS" | "SMMS" | "TDMS" | "COA">("TMS");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<ImportBatchResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [batches, setBatches] = useState<ImportBatchRecord[]>([]);
  const [loadingBatches, setLoadingBatches] = useState<boolean>(false);
  const [rawText, setRawText] = useState<string>("");

  const loadBatches = async () => {
    setLoadingBatches(true);
    try {
      const data = await RailSyncAPI.getImportBatches();
      setBatches(data.batches || []);
    } catch (err: any) {
      console.error("Failed to load import batches:", err);
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBatches();
      setImportResult(null);
      setImportError(null);
    }
  }, [isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setImportError(null);
    setImportResult(null);
    try {
      const res = await RailSyncAPI.importDataset(selectedSource, file, file.name);
      setImportResult(res);
      await loadBatches();
      if (onDataImported) onDataImported();
    } catch (err: any) {
      setImportError(err.message || "Failed to import dataset");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRawSubmit = async () => {
    if (!rawText.trim()) return;
    setIsUploading(true);
    setImportError(null);
    setImportResult(null);
    try {
      const res = await RailSyncAPI.importDataset(selectedSource, rawText, `manual_${selectedSource.toLowerCase()}.csv`);
      setImportResult(res);
      setRawText("");
      await loadBatches();
      if (onDataImported) onDataImported();
    } catch (err: any) {
      setImportError(err.message || "Failed to import raw text");
    } finally {
      setIsUploading(false);
    }
  };

  const handleImportSample = async (source: "TMS" | "SMMS" | "TDMS" | "COA") => {
    setIsUploading(true);
    setImportError(null);
    setImportResult(null);
    setSelectedSource(source);
    try {
      const filename = `data/${source.toLowerCase()}_sample.csv`;
      const res = await RailSyncAPI.importFromDataFolder(source, filename);
      setImportResult(res);
      await loadBatches();
      if (onDataImported) onDataImported();
    } catch (err: any) {
      setImportError(err.message || `Failed to import ${source} sample dataset`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    try {
      await RailSyncAPI.deleteImportBatch(batchId);
      await loadBatches();
      if (onDataImported) onDataImported();
    } catch (err: any) {
      alert("Failed to delete batch: " + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100"
        >
          {/* Header */}
          <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white font-serif flex items-center gap-2">
                  Unified Railway Data Pipeline
                  <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                    Step 2 Authoritative
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Ingest, normalize, validate, and audit TMS, SMMS, TDMS, and COA railway datasets
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-900/50 px-6">
            <button
              onClick={() => setActiveTab("import")}
              className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
                activeTab === "import"
                  ? "border-amber-400 text-amber-400 bg-slate-800/40"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Import Dataset
            </button>
            <button
              onClick={() => setActiveTab("datasets")}
              className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
                activeTab === "datasets"
                  ? "border-amber-400 text-amber-400 bg-slate-800/40"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Sample Datasets
            </button>
            <button
              onClick={() => setActiveTab("lineage")}
              className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
                activeTab === "lineage"
                  ? "border-amber-400 text-amber-400 bg-slate-800/40"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Audit Lineage & Batches
              <span className="bg-slate-800 text-[10px] font-mono px-1.5 py-0.2 rounded text-slate-300">
                {batches.length}
              </span>
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* TAB 1: IMPORT DATASET */}
            {activeTab === "import" && (
              <div className="space-y-6">
                {/* Source Selection Buttons */}
                <div>
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2 font-bold">
                    1. Select Source Railway System:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: "TMS", name: "TMS (Track)", desc: "Rail defects, geometry, welds", color: "border-blue-500/50 bg-blue-950/20 text-blue-300" },
                      { id: "SMMS", name: "SMMS (Signal)", desc: "Points, signals, interlocking", color: "border-emerald-500/50 bg-emerald-950/20 text-emerald-300" },
                      { id: "TDMS", name: "TDMS (Traction)", desc: "OHE tension, masts, isolators", color: "border-amber-500/50 bg-amber-950/20 text-amber-300" },
                      { id: "COA", name: "COA (Timetable)", desc: "Train paths & delay matrices", color: "border-purple-500/50 bg-purple-950/20 text-purple-300" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSource(s.id as any)}
                        className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                          selectedSource === s.id
                            ? "border-amber-400 bg-amber-950/40 ring-1 ring-amber-400"
                            : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                        }`}
                      >
                        <div className="font-bold text-sm text-white flex items-center justify-between">
                          {s.name}
                          {selectedSource === s.id && <Check className="w-4 h-4 text-amber-400" />}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 leading-tight">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload Zone */}
                <div>
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2 font-bold">
                    2. Upload CSV or JSON File:
                  </label>
                  <label className="border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 transition group">
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-amber-400 mb-2 transition" />
                    <span className="text-sm font-bold text-slate-200 group-hover:text-white">
                      Click to select file or drag & drop here
                    </span>
                    <span className="text-xs text-slate-500 mt-1 font-mono">
                      Accepts .csv, .json with custom headers (TMS, SMMS, TDMS, COA)
                    </span>
                    <input
                      type="file"
                      accept=".csv,.json,text/csv,application/json"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>

                {/* Direct Raw Text Input */}
                <div>
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2 font-bold">
                    Or Paste Raw CSV / JSON Rows:
                  </label>
                  <textarea
                    rows={4}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`track_code,defect_id,severity_rank,required_repair_duration,inspector_notes\nTRK-01,DEF-1001,4,120,Thermite weld crack at KM 8.4`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={handleRawSubmit}
                      disabled={isUploading || !rawText.trim()}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {isUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      Process Ingestion
                    </button>
                  </div>
                </div>

                {/* Import Status Alert */}
                {importError && (
                  <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Ingestion Error</div>
                      <div>{importError}</div>
                    </div>
                  </div>
                )}

                {importResult && (
                  <div className="p-4 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-400 border-b border-slate-800 pb-2">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Batch {importResult.batch_id} Ingested Successfully
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        Format: {importResult.format_detected}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                      <div className="p-2 bg-slate-900 rounded border border-slate-800">
                        <div className="text-slate-400 text-[10px]">TOTAL</div>
                        <div className="text-lg font-bold text-white">{importResult.total_records}</div>
                      </div>
                      <div className="p-2 bg-slate-900 rounded border border-emerald-800/50">
                        <div className="text-emerald-400 text-[10px]">IMPORTED</div>
                        <div className="text-lg font-bold text-emerald-400">{importResult.imported_records}</div>
                      </div>
                      <div className="p-2 bg-slate-900 rounded border border-amber-800/50">
                        <div className="text-amber-400 text-[10px]">DUPLICATES</div>
                        <div className="text-lg font-bold text-amber-400">{importResult.duplicate_records}</div>
                      </div>
                      <div className="p-2 bg-slate-900 rounded border border-rose-800/50">
                        <div className="text-rose-400 text-[10px]">INVALID</div>
                        <div className="text-lg font-bold text-rose-400">{importResult.invalid_records}</div>
                      </div>
                    </div>

                    {importResult.validation_errors.length > 0 && (
                      <div className="mt-2 text-xs space-y-1">
                        <div className="font-bold text-amber-400 text-[11px]">Validation Feedback:</div>
                        <div className="max-h-24 overflow-y-auto font-mono text-[10px] text-slate-400 space-y-0.5">
                          {importResult.validation_errors.map((err, i) => (
                            <div key={i} className="text-rose-300">
                              Row {err.row}: {err.field} - {err.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SAMPLE DATASETS (1-CLICK INGESTION) */}
            {activeTab === "datasets" && (
              <div className="space-y-4">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Click any sample dataset below to immediately ingest realistic multi-department records into the persistent SQLite database.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      id: "TMS",
                      title: "TMS Track Defects Dataset",
                      path: "data/tms_sample.csv",
                      count: "50 records",
                      corridors: "NDLS-HWH-01, NDLS-CNB-07, CNB-MGS-01",
                      types: "Weld fractures, gauge widening, acoustic anomalies, sleeper wear",
                      badge: "bg-blue-900/60 text-blue-300 border-blue-700/50"
                    },
                    {
                      id: "SMMS",
                      title: "SMMS Signal Faults Dataset",
                      path: "data/smms_sample.csv",
                      count: "30 records",
                      corridors: "NDLS-HWH-01, NDLS-CNB-07, CNB-MGS-01",
                      types: "Point machine overload, lamp failures, axle counter drift",
                      badge: "bg-emerald-900/60 text-emerald-300 border-emerald-700/50"
                    },
                    {
                      id: "TDMS",
                      title: "TDMS OHE Traction Dataset",
                      path: "data/tdms_sample.csv",
                      count: "25 records",
                      corridors: "NDLS-HWH-01, NDLS-CNB-07, CNB-MGS-01",
                      types: "Catenary wire tension loss, dropper wear, isolator flashover",
                      badge: "bg-amber-900/60 text-amber-300 border-amber-700/50"
                    },
                    {
                      id: "COA",
                      title: "COA Train Timetable Dataset",
                      path: "data/coa_sample.csv",
                      count: "37 schedules",
                      corridors: "Trunk corridors NDLS-HWH, NDLS-CNB, CNB-MGS",
                      types: "Rajdhani, Vande Bharat, Duronto, Freight rake paths",
                      badge: "bg-purple-900/60 text-purple-300 border-purple-700/50"
                    },
                  ].map((ds) => (
                    <div
                      key={ds.id}
                      className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between space-y-3 hover:border-slate-700 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${ds.badge}`}>
                            {ds.id} • {ds.count}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">{ds.path}</span>
                        </div>
                        <h3 className="font-bold text-sm text-white font-serif">{ds.title}</h3>
                        <p className="text-xs text-slate-400 mt-1 leading-snug">{ds.types}</p>
                        <div className="text-[10px] text-slate-500 mt-2 font-mono">
                          Corridors: {ds.corridors}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleImportSample(ds.id as any)}
                        disabled={isUploading}
                        className="w-full py-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {isUploading && selectedSource === ds.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        Ingest {ds.id} Dataset
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: AUDIT LINEAGE & BATCHES */}
            {activeTab === "lineage" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-300 font-mono">
                    Historical Dataset Batches ({batches.length})
                  </div>
                  <button
                    onClick={loadBatches}
                    className="p-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingBatches ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>

                {batches.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-xl">
                    No import batches found. Use the Import Dataset tab to ingest records.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {batches.map((b) => (
                      <div
                        key={b.batch_id}
                        className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-400">{b.batch_id}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 rounded text-slate-300">
                              {b.source_system}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {new Date(b.imported_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-slate-400 font-mono text-[11px]">
                            File: <span className="text-slate-300">{b.filename}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-3 font-mono text-[11px]">
                            <span className="text-emerald-400 font-bold">
                              +{b.imported_records} imported
                            </span>
                            {b.duplicate_records > 0 && (
                              <span className="text-amber-400">
                                {b.duplicate_records} dupes
                              </span>
                            )}
                            {b.invalid_records > 0 && (
                              <span className="text-rose-400">
                                {b.invalid_records} invalid
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleDeleteBatch(b.batch_id)}
                            title="Delete batch and linked records"
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between">
            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              FastAPI / SQLite Engine Ready
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
