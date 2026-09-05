import React, { useState } from "react";
import { 
  X, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Printer, 
  Wrench, 
  AlertTriangle, 
  CheckCircle, 
  Activity, 
  Zap, 
  Cpu, 
  Eye, 
  Info,
  Compass
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CadMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetId?: string | null;
  assetTitle?: string;
  assetType?: string;
  location?: string;
  onCreateWorkOrder?: (assetId: string) => void;
}

interface CadNode {
  id: string;
  name: string;
  x: number;
  y: number;
  type: "SENSOR" | "SIGNAL" | "RAIL" | "OHE";
  status: "OK" | "WARNING" | "CRITICAL";
  readings: { label: string; value: string; unit: string }[];
  description: string;
}

export const CadMapModal: React.FC<CadMapModalProps> = ({
  isOpen,
  onClose,
  assetId = "TRK-01",
  assetTitle = "Track Segment & Interlocking Schematics",
  assetType = "High-Speed Rail / Signal Interlock",
  location = "MAS-TRL Block B1: Chennai Central – Basin Bridge (KM 0.0 - 2.2)",
  onCreateWorkOrder
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [activeLayers, setActiveLayers] = useState({
    rails: true,
    signals: true,
    ohe: true,
    sensors: true,
    grid: true
  });
  const [selectedNode, setSelectedNode] = useState<CadNode | null>(null);
  const [viewMode, setViewMode] = useState<"SCHEMATIC" | "CROSS_SECTION">("SCHEMATIC");

  if (!isOpen) return null;

  const titleText = assetTitle || `CAD Schematic - ${assetId}`;
  const displayId = assetId || "TRK-01";

  // CAD Inspection Nodes for the interactive vector map
  const cadNodes: CadNode[] = [
    {
      id: "NODE-A1",
      name: "Thermite Weld Stress Sensor #104",
      x: 180,
      y: 160,
      type: "SENSOR",
      status: "CRITICAL",
      description: "Acoustic micro-crack vibration detected on UP Main line weld joint.",
      readings: [
        { label: "Acoustic Freq", value: "14.2", unit: "kHz" },
        { label: "Tensile Stress", value: "98.4", unit: "MPa" },
        { label: "Temp Delta", value: "+8.2", unit: "°C" }
      ]
    },
    {
      id: "NODE-B2",
      name: "Point Interlocking Motor SIG-44",
      x: 360,
      y: 240,
      type: "SIGNAL",
      status: "WARNING",
      description: "Interlocking switch drive latency elevated during route alignment.",
      readings: [
        { label: "Switch Response", value: "1.42", unit: "sec" },
        { label: "Motor Current", value: "4.8", unit: "A" },
        { label: "Lock Pins", value: "Aligned", unit: "" }
      ]
    },
    {
      id: "NODE-C3",
      name: "OHE Overhead Catenary Mast 88X",
      x: 520,
      y: 110,
      type: "OHE",
      status: "OK",
      description: "25kV AC contact wire tension droop within nominal tolerances.",
      readings: [
        { label: "Line Voltage", value: "25.4", unit: "kV" },
        { label: "Tension Load", value: "22.1", unit: "kN" },
        { label: "Contact Wear", value: "1.2", unit: "mm" }
      ]
    },
    {
      id: "NODE-D4",
      name: "Axle Counter Wheel Sensor AC-09",
      x: 680,
      y: 160,
      type: "RAIL",
      status: "OK",
      description: "Solid-state wheel detection pulse transducer operating nominally.",
      readings: [
        { label: "Pulse Count", value: "14,820", unit: "axles" },
        { label: "Signal SNR", value: "42.1", unit: "dB" },
        { label: "Supply Voltage", value: "24.0", unit: "V DC" }
      ]
    }
  ];

  const handleExportBlueprint = () => {
    const content = `CAD DXF BLUEPRINT EXPORT\nAsset ID: ${displayId}\nTitle: ${titleText}\nExported: ${new Date().toISOString()}\nLayers: ${JSON.stringify(activeLayers)}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CAD_Blueprint_${displayId}_Rev4.dxf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="bg-slate-900 text-slate-100 rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl border border-slate-800 overflow-hidden relative"
        >
          {/* Top Header Bar */}
          <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
                <Cpu className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {displayId}
                  </span>
                  <span className="text-xs font-bold text-slate-400 font-mono uppercase">
                    CAD Vector Schematics • DXF Rev 4.2
                  </span>
                </div>
                <h2 className="text-base font-black text-white tracking-tight mt-0.5">
                  {titleText}
                </h2>
              </div>
            </div>

            {/* Right Action Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode(viewMode === "SCHEMATIC" ? "CROSS_SECTION" : "SCHEMATIC")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center space-x-1.5 ${
                  viewMode === "SCHEMATIC" 
                    ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{viewMode === "SCHEMATIC" ? "2D Plan View" : "3D Rail Profile"}</span>
              </button>

              <button
                onClick={handleExportBlueprint}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center space-x-1.5"
                title="Download DXF Vector File"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Export DXF</span>
              </button>

              {onCreateWorkOrder && (
                <button
                  onClick={() => {
                    onClose();
                    onCreateWorkOrder(displayId);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-md transition flex items-center space-x-1.5"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Work Order</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sub Header Toolbar: Layer Controls & Zoom */}
          <div className="bg-slate-900/90 px-6 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between text-xs gap-3">
            {/* Layer Toggles */}
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>CAD Layers:</span>
              </span>

              {[
                { key: "rails", label: "Rails Geometry", color: "blue" },
                { key: "signals", label: "Signal Interlocks", color: "amber" },
                { key: "ohe", label: "25kV Catenary", color: "purple" },
                { key: "sensors", label: "Telemetry Sensors", color: "emerald" }
              ].map(layer => (
                <button
                  key={layer.key}
                  onClick={() => setActiveLayers(prev => ({ ...prev, [layer.key]: !prev[layer.key as keyof typeof activeLayers] }))}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                    activeLayers[layer.key as keyof typeof activeLayers]
                      ? "bg-slate-800 border-slate-600 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-500 line-through opacity-60"
                  }`}
                >
                  {layer.label}
                </button>
              ))}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 font-mono text-xs">
              <button 
                onClick={() => setZoomLevel(prev => Math.max(75, prev - 25))}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-bold text-blue-400 min-w-[50px] text-center">{zoomLevel}%</span>
              <button 
                onClick={() => setZoomLevel(prev => Math.min(250, prev + 25))}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setZoomLevel(100)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Main Blueprint Canvas Area */}
          <div className="flex-1 relative bg-slate-950 overflow-hidden flex items-center justify-center p-4">
            
            {/* SVG Engineering CAD Blueprint Grid */}
            <div 
              className="w-full h-full relative flex items-center justify-center transition-transform duration-200 ease-out"
              style={{ transform: `scale(${zoomLevel / 100})` }}
            >
              <svg 
                viewBox="0 0 900 450" 
                className="w-full h-full max-h-[550px] select-none"
              >
                <defs>
                  {/* Grid Pattern */}
                  <pattern id="cadGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                  </pattern>
                  <pattern id="railTie" width="12" height="40" patternUnits="userSpaceOnUse">
                    <rect x="2" y="0" width="8" height="40" fill="#334155" rx="1" />
                  </pattern>
                </defs>

                {/* Grid Background */}
                {activeLayers.grid && <rect width="100%" height="100%" fill="url(#cadGrid)" />}

                {/* Dimension Lines & KM Markers */}
                <g stroke="#475569" strokeWidth="1" strokeDasharray="4 4" fontSize="10" fill="#64748b" fontFamily="monospace">
                  <line x1="50" y1="50" x2="850" y2="50" />
                  <text x="60" y="42">KM 4.2</text>
                  <text x="300" y="42">KM 6.0</text>
                  <text x="550" y="42">KM 8.5 (Junction)</text>
                  <text x="800" y="42">KM 12.0</text>

                  {/* Vertical Alignment Grid Lines */}
                  <line x1="180" y1="40" x2="180" y2="400" />
                  <line x1="360" y1="40" x2="360" y2="400" />
                  <line x1="520" y1="40" x2="520" y2="400" />
                  <line x1="680" y1="40" x2="680" y2="400" />
                </g>

                {/* RAIL GEOMETRY LAYER */}
                {activeLayers.rails && (
                  <g>
                    {/* Sleepers / Concrete Ties for Track 1 */}
                    <rect x="60" y="145" width="780" height="30" fill="url(#railTie)" opacity="0.6" />
                    {/* Sleepers for Track 2 */}
                    <rect x="60" y="225" width="780" height="30" fill="url(#railTie)" opacity="0.6" />

                    {/* Main Rail Line UP (Track 1) */}
                    <line x1="60" y1="150" x2="840" y2="150" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" />
                    <line x1="60" y1="170" x2="840" y2="170" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" />
                    <text x="70" y="142" fill="#60a5fa" fontSize="11" fontWeight="bold" fontFamily="sans-serif">UP MAIN (TRACK 01)</text>

                    {/* Main Rail Line DN (Track 2) */}
                    <line x1="60" y1="230" x2="840" y2="230" stroke="#0ea5e9" strokeWidth="6" strokeLinecap="round" />
                    <line x1="60" y1="250" x2="840" y2="250" stroke="#0ea5e9" strokeWidth="6" strokeLinecap="round" />
                    <text x="70" y="222" fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="sans-serif">DN MAIN (TRACK 02)</text>

                    {/* Turnout Switch Interlock Crossover */}
                    <path d="M 320 170 Q 360 200 400 230" fill="none" stroke="#f59e0b" strokeWidth="5" strokeDasharray="6 3" />
                  </g>
                )}

                {/* OHE CATENARY WIRE LAYER */}
                {activeLayers.ohe && (
                  <g opacity="0.85">
                    {/* Overhead Contact Wire */}
                    <line x1="60" y1="110" x2="840" y2="110" stroke="#a855f7" strokeWidth="2.5" strokeDasharray="8 2" />
                    <line x1="60" y1="310" x2="840" y2="310" stroke="#a855f7" strokeWidth="2.5" strokeDasharray="8 2" />

                    {/* Catenary Mast Masts */}
                    {[120, 280, 440, 600, 760].map(x => (
                      <g key={x}>
                        <line x1={x} y1="90" x2={x} y2="330" stroke="#9333ea" strokeWidth="3" />
                        <rect x={x - 6} y="85" width="12" height="10" fill="#a855f7" rx="2" />
                        <circle cx={x} cy="110" r="4" fill="#e9d5ff" />
                      </g>
                    ))}
                  </g>
                )}

                {/* SIGNAL INTERLOCKING LAYER */}
                {activeLayers.signals && (
                  <g>
                    {/* Signal Post SIG-44 */}
                    <g transform="translate(360, 265)">
                      <line x1="0" y1="0" x2="0" y2="40" stroke="#f59e0b" strokeWidth="4" />
                      <rect x="-12" y="-35" width="24" height="35" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" rx="4" />
                      <circle cx="0" cy="-24" r="5" fill="#ef4444" className="animate-pulse" />
                      <circle cx="0" cy="-10" r="5" fill="#f59e0b" />
                      <text x="18" y="-12" fill="#fbbf24" fontSize="10" fontWeight="bold" fontFamily="monospace">SIG-44</text>
                    </g>

                    {/* Signal Post SIG-12 */}
                    <g transform="translate(680, 100)">
                      <line x1="0" y1="0" x2="0" y2="40" stroke="#10b981" strokeWidth="4" />
                      <rect x="-12" y="-35" width="24" height="35" fill="#1e293b" stroke="#10b981" strokeWidth="2" rx="4" />
                      <circle cx="0" cy="-24" r="5" fill="#10b981" />
                      <text x="18" y="-12" fill="#34d399" fontSize="10" fontWeight="bold" fontFamily="monospace">SIG-12</text>
                    </g>
                  </g>
                )}

                {/* TELEMETRY SENSORS LAYER & INTERACTIVE NODES */}
                {activeLayers.sensors && cadNodes.map(node => {
                  const isSelected = selectedNode?.id === node.id;
                  return (
                    <g 
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className="cursor-pointer group"
                    >
                      {/* Outer Radar Pulsing Ring */}
                      <circle 
                        cx={node.x} 
                        cy={node.y} 
                        r={isSelected ? "18" : "12"} 
                        fill={node.status === "CRITICAL" ? "#ef4444" : node.status === "WARNING" ? "#f59e0b" : "#10b981"}
                        opacity="0.25"
                        className="animate-ping"
                      />

                      {/* Main Node Point */}
                      <circle 
                        cx={node.x} 
                        cy={node.y} 
                        r={isSelected ? "10" : "7"} 
                        fill={node.status === "CRITICAL" ? "#ef4444" : node.status === "WARNING" ? "#f59e0b" : "#10b981"}
                        stroke="#ffffff"
                        strokeWidth="2.5"
                      />

                      {/* Node Label Tag */}
                      <rect 
                        x={node.x - 30} 
                        y={node.y - 30} 
                        width="60" 
                        height="16" 
                        fill="#0f172a" 
                        stroke={isSelected ? "#3b82f6" : "#334155"} 
                        strokeWidth="1" 
                        rx="4" 
                      />
                      <text 
                        x={node.x} 
                        y={node.y - 18} 
                        textAnchor="middle" 
                        fill="#f8fafc" 
                        fontSize="9" 
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {node.id}
                      </text>
                    </g>
                  );
                })}

                {/* CAD Legend */}
                <g transform="translate(40, 395)" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
                  <rect x="0" y="-15" width="480" height="32" fill="#020617" stroke="#1e293b" rx="6" />
                  <circle cx="20" cy="0" r="4" fill="#ef4444" />
                  <text x="30" y="4">Critical Alert</text>
                  <circle cx="120" cy="0" r="4" fill="#f59e0b" />
                  <text x="130" y="4">Warning / Maint</text>
                  <circle cx="230" cy="0" r="4" fill="#10b981" />
                  <text x="240" y="4">Nominal Node</text>
                  <line x1="320" y1="0" x2="340" y2="0" stroke="#3b82f6" strokeWidth="3" />
                  <text x="350" y="4">Rail Steel</text>
                  <line x1="410" y1="0" x2="430" y2="0" stroke="#a855f7" strokeWidth="2" strokeDasharray="3 2" />
                  <text x="440" y="4">25kV OHE</text>
                </g>
              </svg>
            </div>

            {/* Floating Inspector Panel for Selected Node */}
            <AnimatePresence>
              {selectedNode && (
                <motion.div
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  className="absolute right-6 top-6 w-80 bg-slate-900/95 border border-slate-700 rounded-2xl p-4 shadow-2xl backdrop-blur-md z-30"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        selectedNode.status === "CRITICAL" ? "bg-red-500 animate-pulse" :
                        selectedNode.status === "WARNING" ? "bg-amber-500" : "bg-emerald-500"
                      }`} />
                      <span className="font-mono text-xs font-black text-white">{selectedNode.id}</span>
                    </div>
                    <button 
                      onClick={() => setSelectedNode(null)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-xs font-bold text-white mt-2.5">{selectedNode.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {selectedNode.description}
                  </p>

                  <div className="grid grid-cols-3 gap-2 my-3">
                    {selectedNode.readings.map((r, idx) => (
                      <div key={idx} className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
                        <span className="text-[9px] font-mono text-slate-400 block uppercase">{r.label}</span>
                        <span className="text-xs font-black text-blue-400 font-mono mt-0.5 block">
                          {r.value} <span className="text-[9px] text-slate-500">{r.unit}</span>
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
                    {onCreateWorkOrder && (
                      <button
                        onClick={() => {
                          onClose();
                          onCreateWorkOrder(selectedNode.id);
                        }}
                        className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>Work Order</span>
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedNode(null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                    >
                      Dismiss
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Status Bar */}
          <div className="bg-slate-950 px-6 py-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <div className="flex items-center space-x-4">
              <span>SECTION: <strong className="text-slate-200">{location}</strong></span>
              <span>•</span>
              <span>GRID: <strong className="text-blue-400">X: 412.04 Y: 180.20</strong></span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1 text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>CAD SCHEMATIC INTEGRITY VALIDATED</span>
              </span>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
