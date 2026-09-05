import React, { useState, useEffect } from "react";
import { Wrench, X, Calendar, Clock, AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AssetRecord {
  id: string;
  asset_id: string;
  name?: string;
  asset_name?: string;
  type?: string;
  asset_type?: string;
  section?: string;
  location_section?: string;
  corridor?: string;
}

interface WorkOrderModalProps {
  assetId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const WorkOrderModal: React.FC<WorkOrderModalProps> = ({
  assetId: initialAssetId,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [title, setTitle] = useState<string>("");
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [department, setDepartment] = useState<string>("TMS");
  const [urgency, setUrgency] = useState<string>("HIGH");
  const [duration, setDuration] = useState<number>(90);
  const [description, setDescription] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState<string>("Corridor Maintenance Unit");
  const [status, setStatus] = useState<string>("PENDING");

  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [assetsLoading, setAssetsLoading] = useState<boolean>(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Reset or initialize state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setSubmitError(null);
    setValidationErrors({});
    
    // Default due date to tomorrow noon if not set
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDueDateStr = tomorrow.toISOString().slice(0, 10);
    setDueDate(defaultDueDateStr);

    // If an initial assetId is provided, select it
    if (initialAssetId) {
      setSelectedAssetId(initialAssetId);
      setTitle(`WO-${initialAssetId}-${Date.now().toString().slice(-4)}`);
    } else {
      setTitle(`WO-CORRIDOR-${Date.now().toString().slice(-4)}`);
    }

    // Fetch real live assets from authoritative backend
    const fetchAssets = async () => {
      setAssetsLoading(true);
      setAssetsError(null);
      try {
        const res = await fetch("/api/v1/assets");
        if (!res.ok) {
          throw new Error("HTTP " + res.status);
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          setAssets(data);
          if (!initialAssetId && data.length > 0) {
            const firstId = data[0].asset_id || data[0].id;
            setSelectedAssetId(firstId);
            setTitle(`WO-${firstId}-${Date.now().toString().slice(-4)}`);
          }
        } else {
          setAssets([]);
        }
      } catch (err) {
        console.error("Failed to load live assets:", err);
        setAssetsError("Error occurred while loading live data.");
      } finally {
        setAssetsLoading(false);
      }
    };

    fetchAssets();
  }, [isOpen, initialAssetId]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!title.trim()) {
      errors.title = "Work Order Title is required.";
    }
    if (!selectedAssetId.trim()) {
      errors.assetId = "Asset selection is required.";
    }
    if (!description.trim()) {
      errors.description = "Work Instructions / Description is required.";
    }
    if (!dueDate) {
      errors.dueDate = "Due Date is required.";
    }
    if (!duration || duration <= 0) {
      errors.duration = "Window duration must be greater than 0 minutes.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      title: title.trim(),
      assetId: selectedAssetId.trim(),
      department: department.trim().toUpperCase(),
      urgency: urgency.trim().toUpperCase(),
      description: description.trim(),
      duration: Number(duration),
      status: status.trim().toUpperCase(),
      dueDate: new Date(dueDate).toISOString(),
      assignedTo: assignedTo.trim() || "Corridor Engineering Division"
    };

    try {
      const res = await fetch("/api/v1/work-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let errMessage = "Unable to create work order. Please try again.";
        try {
          const errData = await res.json();
          if (errData?.error) errMessage = errData.error;
        } catch {
          // ignore json parse error
        }
        throw new Error(errMessage);
      }

      // Successful persistence in backend
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error("Failed to create work order:", err);
      setSubmitError(err?.message || "Error occurred while loading live data.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl max-w-xl w-full p-6 text-slate-900 shadow-2xl relative border border-slate-300 my-8"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-50 rounded-xl text-blue-700 border border-blue-200">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-wide font-serif">
                  Add Maintenance Work Order
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  Authoritative Backend Persistence • Southern Railway CTC
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Submission / Live Error Banners */}
          {submitError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {assetsError && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-800 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{assetsError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Title */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1 font-sans">
                Work Order Title <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (validationErrors.title) {
                    setValidationErrors(prev => ({ ...prev, title: "" }));
                  }
                }}
                placeholder="e.g. WO-TRK-01-RAIL-GRIND"
                className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500 ${
                  validationErrors.title ? "border-rose-400 bg-rose-50/50" : "border-slate-300"
                }`}
              />
              {validationErrors.title && (
                <p className="text-[10px] text-rose-600 font-sans mt-0.5">{validationErrors.title}</p>
              )}
            </div>

            {/* Asset Selection & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1 font-sans">
                  Target Asset <span className="text-rose-600">*</span>
                </label>
                {assetsLoading ? (
                  <div className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-500 font-mono">
                    Loading live assets...
                  </div>
                ) : (
                  <select
                    value={selectedAssetId}
                    onChange={(e) => {
                      setSelectedAssetId(e.target.value);
                      if (validationErrors.assetId) {
                        setValidationErrors(prev => ({ ...prev, assetId: "" }));
                      }
                    }}
                    className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500 ${
                      validationErrors.assetId ? "border-rose-400 bg-rose-50/50" : "border-slate-300"
                    }`}
                  >
                    {assets.length === 0 ? (
                      <option value="">No assets available</option>
                    ) : (
                      assets.map((ast) => {
                        const aId = ast.asset_id || ast.id;
                        const aName = ast.asset_name || ast.name || ast.type || "Corridor Track Asset";
                        const aSec = ast.location_section || ast.section || "";
                        return (
                          <option key={aId} value={aId}>
                            {aId} • {aName} {aSec ? `(${aSec})` : ""}
                          </option>
                        );
                      })
                    )}
                  </select>
                )}
                {validationErrors.assetId && (
                  <p className="text-[10px] text-rose-600 font-sans mt-0.5">{validationErrors.assetId}</p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1 font-sans">
                  Department <span className="text-rose-600">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-sans focus:outline-none focus:border-blue-500"
                >
                  <option value="TMS">TMS (Track Machine & Rail Infrastructure)</option>
                  <option value="SMMS">SMMS (Signalling & Interlocking)</option>
                  <option value="TDMS">TDMS (Traction & OHE Power Supply)</option>
                </select>
              </div>
            </div>

            {/* Severity Level & Window Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1 font-sans">
                  Priority / Urgency <span className="text-rose-600">*</span>
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-sans focus:outline-none focus:border-blue-500"
                >
                  <option value="CRITICAL">Critical (Immediate Emergency Block)</option>
                  <option value="HIGH">High (Mandatory Possession within 6h)</option>
                  <option value="MEDIUM">Medium (Scheduled Corridor Window)</option>
                  <option value="LOW">Low (Routine Preventive Servicing)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1 font-sans">
                  Est. Duration (Minutes) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min={15}
                  max={720}
                  step={15}
                  value={duration}
                  onChange={(e) => {
                    setDuration(Number(e.target.value));
                    if (validationErrors.duration) {
                      setValidationErrors(prev => ({ ...prev, duration: "" }));
                    }
                  }}
                  className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500 ${
                    validationErrors.duration ? "border-rose-400 bg-rose-50/50" : "border-slate-300"
                  }`}
                />
                {validationErrors.duration && (
                  <p className="text-[10px] text-rose-600 font-sans mt-0.5">{validationErrors.duration}</p>
                )}
              </div>
            </div>

            {/* Due Date & Assigned To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1 font-sans">
                  Target Due Date <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    if (validationErrors.dueDate) {
                      setValidationErrors(prev => ({ ...prev, dueDate: "" }));
                    }
                  }}
                  className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500 ${
                    validationErrors.dueDate ? "border-rose-400 bg-rose-50/50" : "border-slate-300"
                  }`}
                />
                {validationErrors.dueDate && (
                  <p className="text-[10px] text-rose-600 font-sans mt-0.5">{validationErrors.dueDate}</p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1 font-sans">
                  Assigned Team / Crew
                </label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="e.g. Perambur Track Gang #4"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-sans focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Description / Instructions */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1 font-sans">
                Work Instructions & Description <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (validationErrors.description) {
                    setValidationErrors(prev => ({ ...prev, description: "" }));
                  }
                }}
                placeholder="Specify inspection scope, switch turnout check, ballast packing, or OHE contact wire calibration..."
                className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs text-slate-900 font-sans focus:outline-none focus:border-blue-500 ${
                  validationErrors.description ? "border-rose-400 bg-rose-50/50" : "border-slate-300"
                }`}
              />
              {validationErrors.description && (
                <p className="text-[10px] text-rose-600 font-sans mt-0.5">{validationErrors.description}</p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={{ scale: submitting ? 1 : 1.02 }}
                whileTap={{ scale: submitting ? 1 : 0.98 }}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-700 hover:bg-blue-600 text-white shadow-sm transition uppercase tracking-wider flex items-center space-x-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Saving to Backend...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Create Work Order</span>
                  </>
                )}
              </motion.button>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
