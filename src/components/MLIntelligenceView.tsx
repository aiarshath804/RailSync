import React, { useState, useEffect } from "react";
import { 
  Cpu, 
  Sparkles, 
  BarChart3, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  RefreshCw, 
  Sliders, 
  Layers, 
  TrendingUp, 
  Info, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Database,
  ArrowRight,
  Zap,
  Gauge
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MLModelStatus, 
  MLEvaluationMetrics, 
  BaselineComparisonReport, 
  Step6Scenario, 
  MLRiskAssessment 
} from "../types";
import { Language, translations } from "../lib/translations";

interface MLIntelligenceViewProps {
  lang?: Language;
}

export const MLIntelligenceView: React.FC<MLIntelligenceViewProps> = ({ lang = "EN" }) => {
  const t = translations[lang] || translations.EN;

  // Active Tab
  const [activeTab, setActiveTab] = useState<"overview" | "metrics" | "baseline" | "scenarios" | "sandbox">("overview");

  // State
  const [modelStatus, setModelStatus] = useState<MLModelStatus | null>(null);
  const [metrics, setMetrics] = useState<MLEvaluationMetrics | null>(null);
  const [baselineReport, setBaselineReport] = useState<BaselineComparisonReport | null>(null);
  const [scenarios, setScenarios] = useState<Step6Scenario[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRetraining, setIsRetraining] = useState<boolean>(false);
  const [retrainMsg, setRetrainMsg] = useState<string | null>(null);
  const [isRunningScenarios, setIsRunningScenarios] = useState<boolean>(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  // Live Predictor Sandbox State
  const [sbDept, setSbDept] = useState<string>("TMS");
  const [sbDefect, setSbDefect] = useState<string>("WELD_FRACTURE");
  const [sbSeverity, setSbSeverity] = useState<number>(4);
  const [sbOverdue, setSbOverdue] = useState<number>(3.0);
  const [sbRepeats, setSbRepeats] = useState<number>(3);
  const [sbInspectionDays, setSbInspectionDays] = useState<number>(140);
  const [sbAssetAge, setSbAssetAge] = useState<number>(16.0);
  const [sbWeatherRisk, setSbWeatherRisk] = useState<number>(0.35);
  const [sbPrediction, setSbPrediction] = useState<MLRiskAssessment | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);

  // Fetch ML Overview Data
  const loadMLData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Model Status
      const statusRes = await fetch("/api/v1/ml/status");
      if (statusRes.ok) {
        const sData = await statusRes.json();
        setModelStatus(sData);
      }

      // 2. Fetch Metrics
      const metricsRes = await fetch("/api/v1/ml/metrics");
      if (metricsRes.ok) {
        const mData = await metricsRes.json();
        setMetrics(mData);
      }

      // 3. Fetch Baseline Comparison
      const baseRes = await fetch("/api/v1/ml/baseline-comparison");
      if (baseRes.ok) {
        const bData = await baseRes.json();
        setBaselineReport(bData);
      }

      // 4. Fetch Demonstration Scenarios
      const scRes = await fetch("/api/v1/ml/scenarios");
      if (scRes.ok) {
        const scData = await scRes.json();
        setScenarios(scData.scenarios || []);
        if (scData.scenarios?.length > 0) {
          setActiveScenarioId(scData.scenarios[0].scenario_id);
        }
      }
    } catch (err) {
      console.error("Error fetching ML intelligence data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMLData();
  }, []);

  // Retrain Handler
  const handleRetrain = async () => {
    setIsRetraining(true);
    setRetrainMsg(null);
    try {
      const res = await fetch("/api/v1/ml/retrain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ n_estimators: 35, max_depth: 6 })
      });
      if (res.ok) {
        const data = await res.json();
        setRetrainMsg(
          `Model successfully retrained (${data.training_results?.n_estimators || 35} trees). Accuracy: ${(data.training_results?.accuracy * 100).toFixed(1)}%, Weighted F1: ${data.training_results?.weighted_f1?.toFixed(3)}`
        );
        await loadMLData();
      }
    } catch (err) {
      setRetrainMsg("Retraining error. Please retry.");
    } finally {
      setIsRetraining(false);
    }
  };

  // Run Scenarios Handler
  const handleRunAllScenarios = async () => {
    setIsRunningScenarios(true);
    try {
      const res = await fetch("/api/v1/ml/scenarios/run-all", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setScenarios(data.scenarios || []);
      }
    } catch (err) {
      console.error("Failed to run scenarios:", err);
    } finally {
      setIsRunningScenarios(false);
    }
  };

  // Run Live Sandbox Prediction
  const handleRunPrediction = async () => {
    setIsPredicting(true);
    try {
      const reqPayload = {
        department_code: sbDept,
        source_system: sbDept,
        defect_type: sbDefect,
        defect_severity: sbSeverity,
        days_overdue: sbOverdue,
        previous_failure_count: sbRepeats,
        days_since_last_inspection: sbInspectionDays,
        asset_age_years: sbAssetAge,
        weather_risk_factor: sbWeatherRisk,
        corridor_id: "NDLS-HWH-01"
      };

      const res = await fetch("/api/v1/ml/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: reqPayload })
      });

      if (res.ok) {
        const data = await res.json();
        setSbPrediction(data.prediction);
      }
    } catch (err) {
      console.error("Prediction error:", err);
    } finally {
      setIsPredicting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-[400px]">
        <div className="bg-white border border-slate-300 rounded-lg p-8 shadow-xs max-w-md w-full text-center space-y-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight font-serif">
            Loading ML Decision Intelligence Model...
          </h3>
          <p className="text-xs text-slate-500 font-mono">
            Reading Random Forest model weights & holdout evaluation metrics...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto bg-slate-50 font-sans">
      
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-lg text-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-purple-500/20 text-purple-300 border border-purple-400/30">
                Step 6 Decision Intelligence
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {modelStatus?.model_version || "RailSync-RF-v1.2.0"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1.5 flex items-center gap-2 font-serif">
              <Cpu className="w-7 h-7 text-amber-400" />
              Machine Learning Decision Intelligence & Analytics
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl mt-1 leading-relaxed">
              Trained pure-Python Random Forest risk classification model delivering multi-factor failure probability, explainable feature attributions, and quantitative comparisons against conventional baseline scheduling.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              id="btn-retrain-model"
              onClick={handleRetrain}
              disabled={isRetraining}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRetraining ? "animate-spin" : ""}`} />
              <span>{isRetraining ? "Retraining Model..." : "Retrain Model (35 Trees)"}</span>
            </button>
          </div>
        </div>

        {/* Retrain Alert */}
        <AnimatePresence>
          {retrainMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-lg flex items-center space-x-3 text-emerald-200 text-sm"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{retrainMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prototype Disclaimer Banner */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-start space-x-2 text-[11px] text-amber-300/90 font-mono">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Authoritative Guardrail Protocol:</strong> The machine-learning component in RailSync is a prototype decision-support model trained on documented maintenance telemetry. Deterministic safety rules and controller overrides remain strictly authoritative.
          </span>
        </div>
      </div>

      {/* 2. Navigation Sub-Tabs */}
      <div className="flex items-center space-x-1 sm:space-x-2 border-b border-slate-300 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-t-lg font-bold text-xs uppercase tracking-wider flex items-center space-x-2 transition ${
            activeTab === "overview"
              ? "bg-white text-blue-900 border-t-2 border-x border-blue-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Model Architecture</span>
        </button>

        <button
          onClick={() => setActiveTab("metrics")}
          className={`px-4 py-2 rounded-t-lg font-bold text-xs uppercase tracking-wider flex items-center space-x-2 transition ${
            activeTab === "metrics"
              ? "bg-white text-blue-900 border-t-2 border-x border-blue-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Holdout Metrics & Confusion Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab("baseline")}
          className={`px-4 py-2 rounded-t-lg font-bold text-xs uppercase tracking-wider flex items-center space-x-2 transition ${
            activeTab === "baseline"
              ? "bg-white text-blue-900 border-t-2 border-x border-blue-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Baseline vs. RailSync AI</span>
        </button>

        <button
          onClick={() => setActiveTab("scenarios")}
          className={`px-4 py-2 rounded-t-lg font-bold text-xs uppercase tracking-wider flex items-center space-x-2 transition ${
            activeTab === "scenarios"
              ? "bg-white text-blue-900 border-t-2 border-x border-blue-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Play className="w-4 h-4 text-emerald-600" />
          <span>Step 6 Scenarios Testbed ({scenarios.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("sandbox")}
          className={`px-4 py-2 rounded-t-lg font-bold text-xs uppercase tracking-wider flex items-center space-x-2 transition ${
            activeTab === "sandbox"
              ? "bg-white text-blue-900 border-t-2 border-x border-blue-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Sliders className="w-4 h-4 text-purple-600" />
          <span>Live Risk Predictor</span>
        </button>
      </div>

      {/* 3. TAB CONTENT */}

      {/* TAB 1: OVERVIEW & ARCHITECTURE */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Model Algorithm</span>
              <span className="text-base font-black text-slate-900 mt-1 block">Random Forest (35 Trees)</span>
              <span className="text-[11px] text-purple-700 font-mono font-medium">Pure Python • Gini Impurity</span>
            </div>

            <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Holdout Accuracy</span>
              <span className="text-2xl font-black text-emerald-700 font-mono mt-0.5 block">
                {((modelStatus?.summary_metrics?.accuracy || 0.688) * 100).toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-500">240 Test Samples (80/20 Holdout)</span>
            </div>

            <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Weighted F1 Score</span>
              <span className="text-2xl font-black text-blue-900 font-mono mt-0.5 block">
                {(modelStatus?.summary_metrics?.weighted_f1 || 0.650).toFixed(3)}
              </span>
              <span className="text-[11px] text-slate-500">Brier Score: {modelStatus?.summary_metrics?.brier_score?.toFixed(3) || "0.112"}</span>
            </div>

            <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Dataset Records</span>
              <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">
                {modelStatus?.dataset_info?.total_records || 1200}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">11 Features • 4 Classes</span>
            </div>
          </div>

          {/* Top Feature Importances */}
          <div className="bg-white border border-slate-300 rounded-lg p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide font-serif flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <span>Feature Importances (Gini Impurity Reduction)</span>
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Relative contribution of operational telemetry dimensions in predicting railway asset failure risk.
            </p>

            <div className="mt-4 space-y-3">
              {modelStatus?.top_features?.map(([feat, imp], idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="font-bold text-slate-800">{feat}</span>
                    <span className="font-semibold text-purple-900">{(imp * 100).toFixed(2)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full"
                      style={{ width: `${Math.min(100, imp * 300)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: METRICS & CONFUSION MATRIX */}
      {activeTab === "metrics" && metrics && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-300 rounded-lg p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide font-serif mb-4 flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-blue-900" />
              <span>Multi-Class Holdout Confusion Matrix (240 Test Samples)</span>
            </h3>

            {/* Confusion Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                    <th className="p-3 text-left font-bold font-serif">Actual \ Predicted</th>
                    <th className="p-3 font-bold text-emerald-800">PRED: LOW</th>
                    <th className="p-3 font-bold text-blue-800">PRED: MEDIUM</th>
                    <th className="p-3 font-bold text-amber-800">PRED: HIGH</th>
                    <th className="p-3 font-bold text-red-800">PRED: CRITICAL</th>
                  </tr>
                </thead>
                <tbody>
                  {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((actualLabel, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-slate-200 hover:bg-slate-50/80">
                      <td className="p-3 text-left font-bold font-mono text-slate-900 bg-slate-50">
                        ACTUAL: {actualLabel}
                      </td>
                      {metrics.evaluation_metrics.confusion_matrix[rowIdx]?.map((val, colIdx) => {
                        const isDiagonal = rowIdx === colIdx;
                        return (
                          <td 
                            key={colIdx} 
                            className={`p-3 font-mono font-bold text-sm ${
                              isDiagonal ? "bg-emerald-50 text-emerald-900 font-black border border-emerald-300" : "text-slate-600"
                            }`}
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Per-Class Report Table */}
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mt-6 mb-3 font-serif">
              Per-Class Classification Report
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                    <th className="p-2.5 font-bold font-serif">Risk Class</th>
                    <th className="p-2.5 font-bold">Precision</th>
                    <th className="p-2.5 font-bold">Recall</th>
                    <th className="p-2.5 font-bold">F1-Score</th>
                    <th className="p-2.5 font-bold">Test Support</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(metrics.evaluation_metrics.per_class_metrics || {}).map(([cName, pMetrics]: [string, any]) => (
                    <tr key={cName} className="border-b border-slate-200">
                      <td className="p-2.5 font-bold font-mono">{cName}</td>
                      <td className="p-2.5 font-mono">{((pMetrics?.precision || 0) * 100).toFixed(1)}%</td>
                      <td className="p-2.5 font-mono">{((pMetrics?.recall || 0) * 100).toFixed(1)}%</td>
                      <td className="p-2.5 font-mono font-bold text-blue-900">{pMetrics?.f1_score?.toFixed(3) || "0.000"}</td>
                      <td className="p-2.5 font-mono text-slate-600">{pMetrics?.support || 0} samples</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BASELINE VS RAILSYNC AI */}
      {activeTab === "baseline" && baselineReport && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-300 rounded-lg p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide font-serif mb-2 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>Quantitative Impact: Conventional Manual Baseline vs. RailSync AI</span>
            </h3>
            <p className="text-xs text-slate-600 mb-6">
              Side-by-side comparative simulation across {baselineReport.workload_summary.total_maintenance_requests} active maintenance requests.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Possession Hours */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Block Possession</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-500 font-bold block">Baseline</span>
                    <span className="text-xl font-black text-rose-700 font-mono">
                      {baselineReport.comparison_metrics.possession_hours.baseline_hours} hrs
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-bold block">RailSync AI</span>
                    <span className="text-xl font-black text-emerald-700 font-mono">
                      {baselineReport.comparison_metrics.possession_hours.railsync_hours} hrs
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 text-xs text-emerald-800 font-bold font-mono">
                  Saved: {baselineReport.comparison_metrics.possession_hours.saved_hours} hrs ({baselineReport.comparison_metrics.possession_hours.efficiency_gain_pct}% reduction)
                </div>
              </div>

              {/* Corridor Asset Availability */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Corridor Availability</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-500 font-bold block">Baseline</span>
                    <span className="text-xl font-black text-slate-700 font-mono">
                      {baselineReport.comparison_metrics.asset_availability.baseline_availability_pct}%
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-bold block">RailSync AI</span>
                    <span className="text-xl font-black text-emerald-700 font-mono">
                      {baselineReport.comparison_metrics.asset_availability.railsync_availability_pct}%
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 text-xs text-emerald-800 font-bold font-mono">
                  Improvement: +{baselineReport.comparison_metrics.asset_availability.improvement_pts} pts
                </div>
              </div>

              {/* Passenger Traffic Delay */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Passenger Traffic Delay</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-500 font-bold block">Baseline</span>
                    <span className="text-xl font-black text-rose-700 font-mono">
                      {baselineReport.comparison_metrics.traffic_disruption.baseline_delay_minutes} min
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-bold block">RailSync AI</span>
                    <span className="text-xl font-black text-emerald-700 font-mono">
                      {baselineReport.comparison_metrics.traffic_disruption.railsync_delay_minutes} min
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 text-xs text-emerald-800 font-bold font-mono">
                  Saved: {baselineReport.comparison_metrics.traffic_disruption.delay_minutes_saved} min delay avoided
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-blue-950 leading-relaxed font-medium">
              <strong>Executive Summary:</strong> {baselineReport.executive_summary}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STEP 6 SCENARIOS TESTBED */}
      {activeTab === "scenarios" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-300 rounded-lg p-4 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide font-serif">
                Step 6 Demonstration & Validation Suite
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Authoritative verification testbed covering high-risk defects, repeat failures, safety override separation, and baseline comparisons.
              </p>
            </div>
            <button
              onClick={handleRunAllScenarios}
              disabled={isRunningScenarios}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-md shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <Play className={`w-3.5 h-3.5 ${isRunningScenarios ? "animate-spin" : ""}`} />
              <span>{isRunningScenarios ? "Running Test Suite..." : "Execute All 6 Scenarios"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Scenarios List */}
            <div className="space-y-2">
              {scenarios.map((sc, idx) => (
                <button
                  key={sc.scenario_id}
                  onClick={() => setActiveScenarioId(sc.scenario_id)}
                  className={`w-full text-left p-3.5 rounded-lg border transition cursor-pointer flex items-start justify-between ${
                    activeScenarioId === sc.scenario_id
                      ? "bg-blue-50/90 border-blue-500 shadow-xs"
                      : "bg-white border-slate-300 hover:border-slate-400"
                  }`}
                >
                  <div className="space-y-1 pr-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                      Scenario {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-900 block font-serif leading-snug">
                      {sc.title}
                    </span>
                  </div>
                  {sc.verification_passed ? (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>PASSED</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold font-mono">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>CHECK</span>
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Scenario Detail View */}
            <div className="lg:col-span-2">
              {(() => {
                const currentSc = scenarios.find((s) => s.scenario_id === activeScenarioId) || scenarios[0];
                if (!currentSc) return null;

                return (
                  <div className="bg-white border border-slate-300 rounded-lg p-6 shadow-xs space-y-4">
                    <div className="border-b border-slate-200 pb-3">
                      <span className="text-[10px] font-bold text-purple-700 font-mono uppercase tracking-widest">
                        {currentSc.scenario_id}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 font-serif mt-0.5">
                        {currentSc.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        {currentSc.description}
                      </p>
                    </div>

                    {/* Verification Box */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-700 uppercase font-serif block">
                        Verification Findings:
                      </span>
                      <p className="text-xs text-slate-800 font-medium leading-relaxed">
                        {currentSc.verification_notes}
                      </p>
                    </div>

                    {/* Prediction & Drivers */}
                    {currentSc.ml_prediction && (
                      <div className="border border-purple-200 bg-purple-50/40 rounded-lg p-4 space-y-2">
                        <span className="text-[11px] font-bold text-purple-900 uppercase font-serif block">
                          ML Model Output & Feature Attributions
                        </span>
                        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                          <div>
                            <span className="text-slate-500 block">Predicted Risk:</span>
                            <strong className="text-purple-900 text-sm font-bold">
                              {currentSc.ml_prediction.predicted_risk_level} ({(currentSc.ml_prediction.failure_risk_probability * 100).toFixed(1)}% prob)
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Confidence:</span>
                            <strong className="text-slate-900 text-sm font-bold">
                              {(currentSc.ml_prediction.model_confidence * 100).toFixed(0)}%
                            </strong>
                          </div>
                        </div>

                        {currentSc.top_drivers && currentSc.top_drivers.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-purple-200/80">
                            <span className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Top Attributions:</span>
                            <div className="space-y-1">
                              {currentSc.top_drivers.map((d, i) => (
                                <div key={i} className="flex justify-between text-xs font-mono">
                                  <span className="text-slate-700">{d.feature}</span>
                                  <span className="font-bold text-purple-900">{d.contribution_score > 0 ? `+${d.contribution_score.toFixed(1)}` : d.contribution_score.toFixed(1)} pts ({d.direction})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: LIVE RISK PREDICTOR SANDBOX */}
      {activeTab === "sandbox" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Controls */}
            <div className="bg-white border border-slate-300 rounded-lg p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide font-serif flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-purple-600" />
                <span>Live Operational Defect Parameters</span>
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Department</label>
                  <select
                    value={sbDept}
                    onChange={(e) => setSbDept(e.target.value)}
                    className="w-full text-xs font-mono p-2 border border-slate-300 rounded bg-white"
                  >
                    <option value="TMS">TMS (Track)</option>
                    <option value="SMMS">SMMS (Signals)</option>
                    <option value="TDMS">TDMS (Traction OHE)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Defect Severity (1-5)</label>
                  <select
                    value={sbSeverity}
                    onChange={(e) => setSbSeverity(parseInt(e.target.value))}
                    className="w-full text-xs font-mono p-2 border border-slate-300 rounded bg-white"
                  >
                    <option value={1}>1 - Minor Surface Flaw</option>
                    <option value={2}>2 - Routine Wear</option>
                    <option value={3}>3 - Moderate Deterioration</option>
                    <option value={4}>4 - High Operational Hazard</option>
                    <option value={5}>5 - Critical Safety Defect</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Defect Type</label>
                <input
                  type="text"
                  value={sbDefect}
                  onChange={(e) => setSbDefect(e.target.value)}
                  className="w-full text-xs font-mono p-2 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Repeat Failure Count</label>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={sbRepeats}
                    onChange={(e) => setSbRepeats(parseInt(e.target.value) || 0)}
                    className="w-full text-xs font-mono p-2 border border-slate-300 rounded"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Days Overdue</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={sbOverdue}
                    onChange={(e) => setSbOverdue(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono p-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Days Since Inspection</label>
                  <input
                    type="number"
                    value={sbInspectionDays}
                    onChange={(e) => setSbInspectionDays(parseInt(e.target.value) || 30)}
                    className="w-full text-xs font-mono p-2 border border-slate-300 rounded"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Asset Age (Years)</label>
                  <input
                    type="number"
                    value={sbAssetAge}
                    onChange={(e) => setSbAssetAge(parseFloat(e.target.value) || 10)}
                    className="w-full text-xs font-mono p-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <button
                onClick={handleRunPrediction}
                disabled={isPredicting}
                className="w-full bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs py-2.5 rounded shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>{isPredicting ? "Evaluating Model..." : "Run ML Risk Inference"}</span>
              </button>
            </div>

            {/* Inference Result */}
            <div className="bg-white border border-slate-300 rounded-lg p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide font-serif mb-4 flex items-center space-x-2">
                <Gauge className="w-4 h-4 text-blue-900" />
                <span>Model Output & Explainable Attribution</span>
              </h3>

              {sbPrediction ? (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                      Predicted Risk Tier
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className={`text-2xl font-black font-mono ${
                        sbPrediction.predicted_risk_level === "CRITICAL" ? "text-red-700" :
                        sbPrediction.predicted_risk_level === "HIGH" ? "text-amber-700" :
                        sbPrediction.predicted_risk_level === "MEDIUM" ? "text-blue-700" : "text-emerald-700"
                      }`}>
                        {sbPrediction.predicted_risk_level}
                      </span>
                      <span className="text-xs font-mono text-slate-600 font-bold">
                        {(sbPrediction.failure_risk_probability * 100).toFixed(1)}% failure prob
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
                      Model Confidence: <strong>{(sbPrediction.model_confidence * 100).toFixed(0)}%</strong>
                      {sbPrediction.is_low_confidence && (
                        <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded">
                          Low Confidence Boundary
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Top Drivers */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2 font-serif">
                      Primary Driving Features
                    </h4>
                    <div className="space-y-2">
                      {sbPrediction.top_feature_contributions?.map((d, i) => (
                        <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono flex justify-between">
                          <span>{d.feature} (val: {String(d.raw_value)})</span>
                          <strong className={d.contribution_score > 0 ? "text-red-700" : "text-emerald-700"}>
                            {d.contribution_score > 0 ? `+${d.contribution_score.toFixed(1)}` : d.contribution_score.toFixed(1)} pts ({d.direction})
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50/60 border border-purple-200 rounded text-xs text-purple-950 font-medium">
                    {sbPrediction.explanation}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 p-6 border-2 border-dashed border-slate-200 rounded-lg">
                  <Sliders className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-xs font-medium">Adjust defect parameters and click "Run ML Risk Inference" to evaluate.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
