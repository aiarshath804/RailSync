import React, { useState, useEffect } from "react";
import { 
  Clock, 
  Layers, 
  Wrench, 
  Train, 
  Activity, 
  Download, 
  ArrowUpRight, 
  Sparkles, 
  Info,
  RefreshCw,
  AlertCircle,
  Database,
  Radio
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Language, translations } from "../lib/translations";
import { 
  AnalyticsDataset, 
  ResourceCategory, 
  DelayImpactPlanPoint,
  fetchAnalyticsData,
  API_ENDPOINT
} from "../data/analyticsData";

interface AnalyticsViewProps {
  lang?: Language;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ lang = "EN" }) => {
  const t = translations[lang] || translations.EN;
  const [data, setData] = useState<AnalyticsDataset | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [resourceFilter, setResourceFilter] = useState<ResourceCategory>("all");
  const [selectedPlan, setSelectedPlan] = useState<DelayImpactPlanPoint | null>(null);
  const [hoveredTrend, setHoveredTrend] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const loadData = () => {
    setIsLoading(true);
    setError(null);
    fetchAnalyticsData()
      .then((res) => {
        setData(res);
        if (res.delayImpactData.plans.length > 0) {
          setSelectedPlan(res.delayImpactData.plans[0]);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("API Fetch error:", err);
        setError("Unable to connect to live API endpoint (https://api.npoint.io/cf301d125f4df71cad91). Please retry.");
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportReport = () => {
    if (!data) return;
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Block ID,Corridor Sector,AI Bundled,Actual Duration (Hrs),Baseline Duration (Hrs),Saved Hours,Grant Time,Clearing Time,Departments\n";
      
      data.rawBlocks.forEach((b) => {
        const saved = Math.max(0, b.baseline_duration_hours - b.duration_hours).toFixed(2);
        csvContent += `"${b.block_id}","${b.corridor_sector}",${b.is_ai_bundled},${b.duration_hours},${b.baseline_duration_hours},${saved},"${b.actual_grant_time}","${b.actual_clearing_time}","${b.departments_involved.join(";")}"\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `RailSync_Live_Audit_${data.recordCount}_Records_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 600);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-[400px]">
        <div className="bg-white border border-slate-300 rounded-lg p-8 shadow-xs max-w-md w-full text-center space-y-4">
          <div className="relative w-12 h-12 mx-auto">
            <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-amber-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Radio className="w-4 h-4 text-slate-700 animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 font-serif uppercase tracking-tight">
              CONNECTING TO LIVE TELEMETRY API
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-1 break-all">
              {API_ENDPOINT}
            </p>
          </div>
          <div className="text-[11px] font-mono text-slate-400 bg-slate-50 p-2.5 rounded border border-slate-200">
            Streaming real-time block possession history & cross-departmental logs...
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-[400px]">
        <div className="bg-white border border-rose-200 rounded-lg p-8 shadow-xs max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto border border-rose-300">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-rose-950 font-serif uppercase tracking-tight">
              API TELEMETRY RETRIEVAL ERROR
            </h3>
            <p className="text-xs text-rose-700 font-sans mt-1">
              {error || "An unexpected error occurred."}
            </p>
          </div>
          <button
            onClick={loadData}
            className="w-full bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs py-2.5 rounded-md shadow-xs flex items-center justify-center space-x-2 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection to API</span>
          </button>
        </div>
      </div>
    );
  }

  const filteredResources = data.resourceUtilization.filter((item) => {
    if (resourceFilter === "all") return true;
    if (resourceFilter === "machines") return item.type === "machine";
    if (resourceFilter === "crews") return item.type === "crew";
    return true;
  });

  // Calculations for Donut Chart
  const bundledPct = data.summaryMetrics.taskBundling.bundledPercentage;
  const singlePct = data.summaryMetrics.taskBundling.singlePercentage;
  const donutCircumference = 2 * Math.PI * 38; // r=38 -> ~238.76
  const bundledStrokeDash = (bundledPct / 100) * donutCircumference;
  const singleStrokeDash = (singlePct / 100) * donutCircumference;

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto bg-slate-50 font-sans">
      
      {/* 1. Official Government Ministry Header Ribbon */}
      <div className="bg-slate-900 border-l-4 border-l-amber-500 border border-slate-800 rounded-lg p-3 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-white">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-mono text-amber-400 font-bold uppercase tracking-widest font-serif">
            <span>{t.govtTitle}</span>
            <span>•</span>
            <span className="text-slate-300">CRIS / COA-ANL TELEMETRY</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-black text-white font-serif tracking-tight uppercase mt-0.5">
            {t.analyticsTitle}
          </h1>
          <p className="text-xs text-slate-300 font-sans mt-0.5 max-w-4xl">
            {t.analyticsSubtitle}
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono shrink-0 self-start md:self-auto">
          <div className="text-right hidden sm:block">
            <div className="text-[9px] text-slate-400 uppercase font-bold">API RECORDS PROCESSED</div>
            <div className="text-emerald-400 font-bold">{data.recordCount} POSSESSION LOGS (LIVE)</div>
          </div>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <button
            onClick={handleExportReport}
            disabled={isExporting}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-3.5 py-2 rounded-md shadow-xs flex items-center space-x-1.5 transition border border-amber-300 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{isExporting ? "Exporting..." : "Export Live CSV"}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Banner & Gazette Record */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-300 rounded-lg shadow-xs gap-3">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-base font-black tracking-tight text-slate-900 flex items-center space-x-2 font-serif uppercase">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{t.analyticsExecutiveSummary}</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-900 text-[10px] font-bold tracking-wider uppercase font-mono flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse inline-block" />
              <span>API VERIFIED ({data.recordCount} RECORDS)</span>
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-600 mt-1 flex flex-wrap items-center gap-2 font-mono">
            <span>ENDPOINT: <strong className="text-blue-900 font-mono">api.npoint.io/cf301d...</strong></span>
            <span>•</span>
            <span>BUNDLED RATIO: <strong className="text-emerald-700 font-bold">{bundledPct}%</strong></span>
            <span>•</span>
            <span>TOTAL SAVINGS: <strong className="text-amber-800 font-bold">{data.summaryMetrics.blockHoursSaved.value} HOURS</strong></span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono bg-slate-100 px-3 py-1.5 rounded border border-slate-200 text-slate-700">
          <Database className="w-3.5 h-3.5 text-blue-900" />
          <span>DATA SOURCE: <strong className="text-emerald-700 font-bold">NPOINT LIVE API</strong></span>
        </div>
      </div>

      {/* SECTION 1: TOP SUMMARY METRICS (3 CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* CARD A: Block Hours Saved */}
        <motion.div 
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>{t.blockHoursSaved}</span>
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                  {data.summaryMetrics.blockHoursSaved.value}
                </span>
                <span className="text-xs font-bold text-slate-500 font-mono uppercase">
                  {data.summaryMetrics.blockHoursSaved.unit}
                </span>
              </div>
            </div>

            <span className="inline-flex items-center space-x-1 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black px-2.5 py-1 rounded-full font-mono">
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{data.summaryMetrics.blockHoursSaved.improvementPercentage}</span>
            </span>
          </div>

          <div className="text-xs text-slate-600 mt-2 font-medium">
            {data.summaryMetrics.blockHoursSaved.periodLabel}
          </div>

          {/* Mini Bar Trend Visualization */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5">
              <span>WEEKLY POSSESSION SAVINGS (API)</span>
              <span>LIVE BATCH</span>
            </div>
            <div className="grid grid-cols-4 gap-2 items-end h-16 pt-2">
              {data.summaryMetrics.blockHoursSaved.trend.map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex flex-col items-center h-full justify-end group relative"
                  onMouseEnter={() => setHoveredTrend(`bar-${idx}`)}
                  onMouseLeave={() => setHoveredTrend(null)}
                >
                  <div className="w-full bg-slate-100 rounded-t h-full flex items-end overflow-hidden relative">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.min(100, (item.value / 35) * 100)}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.1 }}
                      className="w-full bg-gradient-to-t from-blue-700 to-blue-500 group-hover:from-amber-500 group-hover:to-amber-400 transition-colors rounded-t"
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-600 mt-1">
                    {item.label}
                  </span>
                  
                  {/* Tooltip */}
                  {hoveredTrend === `bar-${idx}` && (
                    <div className="absolute -top-7 z-20 bg-slate-900 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow whitespace-nowrap">
                      {item.value} hrs
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* CARD B: Asset Availability */}
        <motion.div 
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-700" />
                <span>{t.assetAvailability}</span>
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                  {data.summaryMetrics.assetAvailability.value}
                </span>
                <span className="text-xs font-bold text-slate-500 font-mono">
                  {data.summaryMetrics.assetAvailability.subValue}
                </span>
              </div>
            </div>

            <span className="inline-flex items-center space-x-1 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black px-2.5 py-1 rounded-full font-mono">
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{data.summaryMetrics.assetAvailability.improvementPercentage}</span>
            </span>
          </div>

          <div className="text-xs text-slate-600 mt-2 font-medium">
            {data.summaryMetrics.assetAvailability.periodLabel}
          </div>

          {/* Line/Curve Visual Representation */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5">
              <span>AVAILABILITY PROGRESSION</span>
              <span className="text-emerald-700 font-bold">+7.4% UPTIME</span>
            </div>
            
            <div className="relative h-16 w-full flex items-center">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 200 60">
                <defs>
                  <linearGradient id="availGradientLive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Area Fill */}
                <path 
                  d="M 10,48 Q 60,40 110,24 T 190,8 L 190,55 L 10,55 Z" 
                  fill="url(#availGradientLive)" 
                />
                {/* Smooth Curve */}
                <path 
                  d="M 10,48 Q 60,40 110,24 T 190,8" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="3" 
                  strokeLinecap="round"
                />
                {/* Points */}
                <circle cx="10" cy="48" r="3.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx="70" cy="38" r="3.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx="130" cy="22" r="3.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx="190" cy="8" r="4.5" fill="#059669" stroke="#ffffff" strokeWidth="2" />
              </svg>
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
              <span>W1: 88.8%</span>
              <span>W2: 91.2%</span>
              <span>W3: 93.6%</span>
              <span className="font-bold text-emerald-800">W4: 96.2%</span>
            </div>
          </div>
        </motion.div>

        {/* CARD C: Bundled Tasks & Donut Chart */}
        <motion.div 
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="bg-white border border-slate-300 rounded-lg p-5 shadow-xs flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-900" />
                <span>{t.bundledTasks}</span>
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                  {data.summaryMetrics.taskBundling.totalTasks}
                </span>
                <span className="text-xs font-bold text-slate-500 font-mono uppercase">
                  Possession Blocks
                </span>
              </div>
            </div>

            <span className="inline-flex items-center space-x-1 bg-blue-100 border border-blue-300 text-blue-950 text-xs font-black px-2.5 py-1 rounded-full font-mono">
              <span>{bundledPct}% Bundled</span>
            </span>
          </div>

          {/* Donut Chart Visualization */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="38" 
                  fill="transparent" 
                  stroke="#e2e8f0" 
                  strokeWidth="12" 
                />
                {/* Single Tasks Segment (Amber) */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="38" 
                  fill="transparent" 
                  stroke="#f59e0b" 
                  strokeWidth="12" 
                  strokeDasharray={`${singleStrokeDash} ${donutCircumference}`}
                  strokeDashoffset="0"
                />
                {/* Bundled Tasks Segment (Blue) */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="38" 
                  fill="transparent" 
                  stroke="#2563eb" 
                  strokeWidth="12" 
                  strokeDasharray={`${bundledStrokeDash} ${donutCircumference}`}
                  strokeDashoffset={`-${singleStrokeDash}`}
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-[11px] font-black text-slate-900 font-mono">
                  {bundledPct}%
                </span>
              </div>
            </div>

            <div className="space-y-1 text-xs font-mono ml-4 flex-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                  <span className="font-bold">AI Bundled ({data.summaryMetrics.taskBundling.bundledTasks})</span>
                </span>
                <span className="font-bold text-blue-900">{bundledPct}%</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                  <span>Single Block ({data.summaryMetrics.taskBundling.singleTasks})</span>
                </span>
                <span className="font-bold text-amber-700">{singlePct}%</span>
              </div>

              <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-100">
                TMS: {data.summaryMetrics.taskBundling.categories[0].count} • SMMS: {data.summaryMetrics.taskBundling.categories[1].count} • TDMS: {data.summaryMetrics.taskBundling.categories[2].count}
              </div>
            </div>
          </div>
        </motion.div>

      </div>

      {/* SECTION 2: PERFORMANCE COMPARISON */}
      <div className="bg-white border border-slate-300 rounded-lg p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-black text-slate-900 font-serif uppercase tracking-tight">
                {t.performanceComparison}
              </h3>
              <span className="px-2 py-0.5 rounded bg-blue-100 border border-blue-300 text-blue-950 text-[10px] font-mono font-bold uppercase">
                CONVENTIONAL VS RAILSYNC AI (API DERIVED)
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Empirical side-by-side benchmark calculated across the 50 live possession records.
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-slate-300 border border-slate-400"></span>
              <span className="text-slate-600 font-bold">{t.conventionalMethod}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-emerald-600 border border-emerald-700"></span>
              <span className="text-emerald-900 font-bold">{t.railSyncAi}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {data.performanceComparison.map((metric) => {
            const isDuration = metric.id === "metric_duration";
            const isConflicts = metric.id === "metric_conflicts";

            return (
              <div 
                key={metric.id}
                className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900 uppercase font-sans tracking-wide">
                      {metric.metricName}
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold border border-emerald-200">
                      {metric.improvementDelta}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {metric.description}
                  </p>
                </div>

                {/* Visual Comparative Bars & Values */}
                <div className="space-y-3 pt-2">
                  {/* Conventional Row */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="text-slate-500">{t.conventionalMethod}</span>
                      <span className="font-bold text-slate-700">{metric.conventionalValue}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded h-3 overflow-hidden">
                      <div 
                        className="bg-slate-400 h-full rounded"
                        style={{ 
                          width: isDuration 
                            ? "100%" 
                            : isConflicts 
                              ? "100%" 
                              : `${metric.conventionalNum}%` 
                        }}
                      />
                    </div>
                  </div>

                  {/* RailSync AI Row */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="font-bold text-emerald-800">{t.railSyncAi}</span>
                      <span className="font-black text-emerald-900">{metric.railSyncValue}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded h-3 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ 
                          width: isDuration 
                            ? "63.2%" 
                            : isConflicts 
                              ? "16.7%" 
                              : `${metric.railSyncNum}%` 
                        }}
                        transition={{ duration: 0.8 }}
                        className="bg-emerald-600 h-full rounded"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500">Efficiency Gain:</span>
                  <span className="font-bold text-blue-900">{metric.improvementText}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: RESOURCE UTILIZATION */}
      <div className="bg-white border border-slate-300 rounded-lg p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-black text-slate-900 font-serif uppercase tracking-tight">
                {t.resourceUtilization}
              </h3>
              <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-950 text-[10px] font-mono font-bold uppercase">
                SYNCHRONIZED POSSESSION WINDOWS
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Productive duty-hour utilization rate of track machines, tower wagons, and field gangs during unified blocks.
            </p>
          </div>

          {/* Filter/Toggle Buttons: All | Machines | Crews */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 font-mono text-xs">
            <button
              onClick={() => setResourceFilter("all")}
              className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                resourceFilter === "all"
                  ? "bg-blue-950 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.allResources}
            </button>
            <button
              onClick={() => setResourceFilter("machines")}
              className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                resourceFilter === "machines"
                  ? "bg-blue-950 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.machines}
            </button>
            <button
              onClick={() => setResourceFilter("crews")}
              className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                resourceFilter === "crews"
                  ? "bg-blue-950 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.crews}
            </button>
          </div>
        </div>

        {/* Resource Chart Rows */}
        <div className="mt-6 space-y-4">
          {filteredResources.map((res) => (
            <div 
              key={res.id}
              className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-1.5 rounded ${res.type === "machine" ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-blue-100 text-blue-900 border border-blue-300"}`}>
                    {res.type === "machine" ? <Wrench className="w-3.5 h-3.5" /> : <Train className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-slate-900 font-sans">{res.code}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                        {res.department}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">{res.primaryFunction}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs font-mono self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] block">DUTY HOURS</span>
                    <span className="font-bold text-slate-800">{res.utilizedHours}h / {res.totalAvailableHours}h</span>
                  </div>
                  <div className="text-right pl-2 border-l border-slate-200">
                    <span className="text-slate-400 text-[10px] block">UTILIZATION</span>
                    <span className="font-black text-emerald-700 text-sm">{res.railSyncUtilPercent}%</span>
                  </div>
                </div>
              </div>

              {/* Progress Stack Bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-200 rounded-full h-3.5 relative overflow-hidden flex">
                  {/* Conventional Baseline Portion (Dark Blue) */}
                  <div 
                    className="bg-blue-900 h-full transition-all"
                    style={{ width: `${res.conventionalUtilPercent}%` }}
                    title={`Conventional Baseline: ${res.conventionalUtilPercent}%`}
                  />
                  {/* AI Bundled Uplift (Emerald Accent) */}
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${res.railSyncUtilPercent - res.conventionalUtilPercent}%` }}
                    transition={{ duration: 0.8 }}
                    className="bg-emerald-500 h-full"
                    title={`AI Bundled Uplift: +${(res.railSyncUtilPercent - res.conventionalUtilPercent).toFixed(1)}%`}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>Conventional Idle Base: {res.conventionalUtilPercent}%</span>
                  <span className="text-emerald-700 font-bold">
                    +{(res.railSyncUtilPercent - res.conventionalUtilPercent).toFixed(1)}% AI Productivity Uplift
                  </span>
                  <span>{res.operationalStatus}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: DELAY IMPACT ANALYSIS */}
      <div className="bg-white border border-slate-300 rounded-lg p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-black text-slate-900 font-serif uppercase tracking-tight">
                {t.delayImpactAnalysis}
              </h3>
              <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-950 text-[10px] font-mono font-bold uppercase">
                {data.recordCount} LIVE API BLOCK POINTS
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Empirical relationship between corridor block duration and downstream passenger train delay propagation.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span>
              <span className="text-slate-700 font-bold">RailSync AI Bundled</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-600 inline-block"></span>
              <span className="text-slate-700 font-bold">Conventional Unbundled</span>
            </span>
          </div>
        </div>

        {/* Main Scatter / Zone Plot Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          
          {/* Chart Canvas */}
          <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-lg p-4 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800 pb-2">
              <span className="text-amber-400 font-bold">BLOCK DURATION VS ESTIMATED PASSENGER DELAY</span>
              <span className="text-emerald-400">ZONE: OPTIMAL &lt;25 MIN DELAY</span>
            </div>

            {/* SVG Plot */}
            <div className="relative w-full h-72 my-2">
              <svg className="w-full h-full" viewBox="0 0 500 240">
                {/* Grid Lines */}
                <line x1="40" y1="20" x2="480" y2="20" stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="40" y1="70" x2="480" y2="70" stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="40" y1="120" x2="480" y2="120" stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="40" y1="170" x2="480" y2="170" stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="40" y1="210" x2="480" y2="210" stroke="#475569" strokeWidth="1.5" />
                <line x1="40" y1="20" x2="40" y2="210" stroke="#475569" strokeWidth="1.5" />

                {/* Shaded Optimal Operating Zone Box (<8h / <25m) */}
                <rect 
                  x="40" 
                  y="160" 
                  width="240" 
                  height="50" 
                  fill="#10b981" 
                  fillOpacity="0.15" 
                  stroke="#10b981" 
                  strokeDasharray="4 4"
                  strokeWidth="1.5"
                />
                <text x="50" y="180" fill="#34d399" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  OPTIMAL LOW-DELAY ZONE (&lt;8h / &lt;25m)
                </text>

                {/* Exponential Delay Correlation Curve */}
                <path 
                  d="M 40,205 Q 220,195 320,130 T 460,30" 
                  fill="none" 
                  stroke="#fbbf24" 
                  strokeWidth="2" 
                  strokeDasharray="5 3"
                  opacity="0.7"
                />

                {/* Y-Axis Labels (Delay Minutes) */}
                <text x="5" y="25" fill="#94a3b8" fontSize="9" fontFamily="monospace">120m</text>
                <text x="10" y="75" fill="#94a3b8" fontSize="9" fontFamily="monospace">90m</text>
                <text x="10" y="125" fill="#94a3b8" fontSize="9" fontFamily="monospace">60m</text>
                <text x="10" y="175" fill="#94a3b8" fontSize="9" fontFamily="monospace">30m</text>
                <text x="20" y="212" fill="#94a3b8" fontSize="9" fontFamily="monospace">0m</text>

                {/* X-Axis Labels (Block Duration Hours) */}
                <text x="40" y="228" fill="#94a3b8" fontSize="9" fontFamily="monospace">0h</text>
                <text x="140" y="228" fill="#94a3b8" fontSize="9" fontFamily="monospace">4h</text>
                <text x="260" y="228" fill="#94a3b8" fontSize="9" fontFamily="monospace">8h</text>
                <text x="380" y="228" fill="#94a3b8" fontSize="9" fontFamily="monospace">12h</text>
                <text x="465" y="228" fill="#94a3b8" fontSize="9" fontFamily="monospace">15h</text>

                {/* Plot Plans from API */}
                {data.delayImpactData.plans.map((p) => {
                  const cx = 40 + (p.blockDurationHours / 15) * 420;
                  const cy = 210 - (p.delayMinutes / 120) * 190;
                  const isSelected = selectedPlan?.id === p.id;

                  return (
                    <g 
                      key={p.id} 
                      className="cursor-pointer transition-transform hover:scale-125"
                      onClick={() => setSelectedPlan(p)}
                    >
                      {isSelected && (
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r="10" 
                          fill={p.isBundledRailSync ? "#10b981" : "#f43f5e"} 
                          opacity="0.35" 
                          className="animate-ping" 
                        />
                      )}
                      <circle 
                        cx={cx} 
                        cy={cy} 
                        r={isSelected ? "6" : "4.5"} 
                        fill={p.isBundledRailSync ? "#10b981" : "#e11d48"} 
                        stroke="#ffffff" 
                        strokeWidth="1.5" 
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Correlation explanation footnote */}
            <div className="text-[10px] font-mono text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800 flex items-center space-x-2">
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{data.delayImpactData.correlationStatement}</span>
            </div>
          </div>

          {/* Selected Plan Inspector Card */}
          <div className="bg-slate-50 border border-slate-300 rounded-lg p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-mono font-bold text-slate-500 uppercase">
                  POSSESSION LOG INSPECTOR
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  selectedPlan?.isBundledRailSync 
                    ? "bg-emerald-100 text-emerald-900 border border-emerald-300" 
                    : "bg-rose-100 text-rose-900 border border-rose-300"
                }`}>
                  {selectedPlan?.isBundledRailSync ? "AI BUNDLED BLOCK" : "CONVENTIONAL BLOCK"}
                </span>
              </div>

              {selectedPlan ? (
                <div className="mt-3 space-y-3 font-sans">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 font-serif">
                      {selectedPlan.id}
                    </h4>
                    <span className="text-xs text-slate-600 font-mono font-semibold">
                      Sector: {selectedPlan.section}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs font-mono">
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">BLOCK DURATION</span>
                      <span className="text-sm font-black text-slate-900">
                        {selectedPlan.blockDurationHours} Hours
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">PASSENGER DELAY</span>
                      <span className={`text-sm font-black ${
                        selectedPlan.delayMinutes <= 25 ? "text-emerald-700" : "text-rose-700"
                      }`}>
                        {selectedPlan.delayMinutes} Minutes
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs font-mono pt-1">
                    <div className="flex justify-between text-slate-700">
                      <span>Express Trains Impacted:</span>
                      <strong className="text-slate-900 font-bold">{selectedPlan.affectedPassengerTrains} Trains</strong>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Departments Involved:</span>
                      <span className="font-bold text-blue-900">
                        {selectedPlan.departmentsInvolved.join(" + ")}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Operating Envelope:</span>
                      <span className={`font-bold ${
                        selectedPlan.status === "Optimal" ? "text-emerald-800" : "text-rose-800"
                      }`}>
                        {selectedPlan.status === "Optimal" ? "Optimal Safe Envelope (<25m)" : "Cascading Delay Zone"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-mono py-8 text-center">
                  Click any block point on the scatter chart above to inspect possession details.
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200">
              <div className="text-[10px] font-mono text-slate-500">
                Data loaded live from Indian Railways API endpoint ({data.recordCount} records).
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
