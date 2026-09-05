import React, { useState } from "react";
import {
  Train,
  Shield,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Zap,
  Hammer,
  Radio,
  Sliders,
  CheckCircle2,
  Sparkles,
  KeyRound,
  Fingerprint,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { DemoAccount, UserRole } from "../types";

export const LoginPage: React.FC = () => {
  const { demoAccounts, login, loginAsDemoRole, isLoading } = useAuth();

  const [email, setEmail] = useState("admin@railsync.gov.in");
  const [password, setPassword] = useState("Admin@RailSync2026");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedRoleTab, setSelectedRoleTab] = useState<UserRole>("ADMINISTRATOR");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle manual sign in form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter your official railway email and security password.");
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || "Authentication failed. Please verify your credentials.");
    }
  };

  // Handle fast demo card selection & auto-fill
  const handleSelectDemoAccount = (account: DemoAccount) => {
    setSelectedRoleTab(account.role);
    setEmail(account.email);
    setPassword(account.password || "");
    setErrorMessage(null);
  };

  // Handle direct one-click sign in as role
  const handleDirectLoginAsRole = async (account: DemoAccount) => {
    setSelectedRoleTab(account.role);
    setEmail(account.email);
    setPassword(account.password || "");
    setErrorMessage(null);
    setIsSubmitting(true);
    await loginAsDemoRole(account.role);
    setIsSubmitting(false);
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "ADMINISTRATOR":
        return <ShieldCheck className="w-5 h-5 text-amber-600" />;
      case "ENGINEERING":
        return <Hammer className="w-5 h-5 text-emerald-600" />;
      case "TRACTION":
        return <Zap className="w-5 h-5 text-cyan-600" />;
      case "SIGNAL_TELECOM":
        return <Radio className="w-5 h-5 text-indigo-600" />;
      case "OPERATIONS_CONTROLLER":
        return <Sliders className="w-5 h-5 text-rose-600" />;
      default:
        return <Shield className="w-5 h-5 text-blue-600" />;
    }
  };

  const getRoleBadgeClasses = (role: UserRole) => {
    switch (role) {
      case "ADMINISTRATOR":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "ENGINEERING":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "TRACTION":
        return "bg-cyan-100 text-cyan-800 border-cyan-300";
      case "SIGNAL_TELECOM":
        return "bg-indigo-100 text-indigo-800 border-indigo-300";
      case "OPERATIONS_CONTROLLER":
        return "bg-rose-100 text-rose-800 border-rose-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Banner / Govt Header */}
      <header className="w-full bg-slate-950/80 border-b border-slate-800 backdrop-blur-md px-6 py-3 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono tracking-wider text-slate-300 uppercase">
            Indian Railways &bull; Southern Railway Zone &bull; CRIS Secure Access Gateway
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[11px] font-mono">
          <span className="flex items-center gap-1 text-slate-400">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            256-Bit SSL Enforced
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Authoritative SQLite Engine Ready
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Official Sign In Card */}
          <div className="lg:col-span-5 bg-slate-950/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            {/* Subtle top ambient glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-500 rounded-full" />

            {/* Platform Branding */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
                  <Train className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    RailSync <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/60 border border-blue-500/40 text-blue-300 font-semibold tracking-wide">ENTERPRISE</span>
                  </h1>
                  <p className="text-xs text-slate-400 font-medium">
                    Corridor Operations &amp; Predictive Maintenance Console
                  </p>
                </div>
              </div>
              <div className="text-[11px] font-mono text-slate-400 bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800/80 mt-3 flex items-center justify-between">
                <span>SECTOR: MAS-TRL-05 (Chennai &bull; Tiruvallur)</span>
                <span className="text-emerald-400 font-semibold">ONLINE</span>
              </div>
            </div>

            {/* Error Message Box */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/60 text-rose-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold block mb-0.5">Authentication Failure</span>
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Sign In Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Official Email / Officer ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@railsync.gov.in"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Security Password
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">CRIS 8+ Chars</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter official password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500/40"
                  />
                  <span>Remember officer session</span>
                </label>
                <span className="text-slate-500 hover:text-slate-400 cursor-pointer">
                  Security Protocol &sect; 14
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authorizing Clearance...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to RailSync Enterprise</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Security Guarantee Footer */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-blue-400" />
                Audit Trail Active
              </span>
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                RBAC Level 3 Enforced
              </span>
            </div>
          </div>

          {/* Right Column: Reference-Inspired Role Switcher & Pre-configured Demo Accounts */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            
            {/* Header info block */}
            <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-5 backdrop-blur-xl">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h2 className="text-base font-bold text-white tracking-wide">
                      Select Departmental Role &bull; Quick Access Accounts
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400">
                    Each account represents a verified Indian Railways operational role with authoritative backend access control and permission enforcement.
                  </p>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-medium shrink-0">
                  5 Authorized Roles
                </span>
              </div>

              {/* Quick Tab Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 mt-4 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
                {demoAccounts.map((account) => {
                  const isSelected = selectedRoleTab === account.role;
                  return (
                    <button
                      key={account.role}
                      type="button"
                      onClick={() => handleSelectDemoAccount(account)}
                      className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-center flex flex-col items-center gap-1 ${
                        isSelected
                          ? "bg-slate-800 text-white shadow-md border border-slate-700"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                      }`}
                    >
                      <span className="scale-90">{getRoleIcon(account.role)}</span>
                      <span className="truncate w-full text-[11px]">{account.role_label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List of Detailed Demo Account Cards */}
            <div className="space-y-3">
              {demoAccounts.map((account) => {
                const isSelected = selectedRoleTab === account.role;
                return (
                  <div
                    key={account.role}
                    className={`rounded-2xl border transition-all duration-200 p-4 sm:p-5 relative ${
                      isSelected
                        ? "bg-slate-950/95 border-blue-500/80 shadow-xl shadow-blue-900/10 ring-1 ring-blue-500/40"
                        : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-950/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      
                      {/* Left: Officer Profile & Role Identity */}
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-md ${
                            account.role === "ADMINISTRATOR"
                              ? "bg-amber-600/90 shadow-amber-900/30"
                              : account.role === "ENGINEERING"
                              ? "bg-emerald-600/90 shadow-emerald-900/30"
                              : account.role === "TRACTION"
                              ? "bg-cyan-600/90 shadow-cyan-900/30"
                              : account.role === "SIGNAL_TELECOM"
                              ? "bg-indigo-600/90 shadow-indigo-900/30"
                              : "bg-rose-600/90 shadow-rose-900/30"
                          }`}
                        >
                          {account.avatar_init}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-white">{account.name}</span>
                            <span
                              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getRoleBadgeClasses(
                                account.role
                              )}`}
                            >
                              {account.role_label}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700">
                              {account.console_id}
                            </span>
                          </div>

                          <div className="text-xs text-slate-400 font-medium">
                            {account.designation} &bull; <span className="text-slate-300 font-semibold">{account.department_name}</span>
                          </div>

                          <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                            {account.description}
                          </p>
                        </div>
                      </div>

                      {/* Right: Auto-fill and Instant Sign In buttons */}
                      <div className="flex sm:flex-col items-center gap-2 shrink-0 sm:min-w-[130px]">
                        <button
                          type="button"
                          onClick={() => handleDirectLoginAsRole(account)}
                          disabled={isSubmitting}
                          className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span>Sign In as {account.role_label.split(" ")[0]}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectDemoAccount(account)}
                          className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium rounded-lg border border-slate-700/80 transition-all cursor-pointer"
                        >
                          Auto-fill
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </main>

      {/* Official Gov / Railway Footer */}
      <footer className="w-full bg-slate-950 border-t border-slate-800/80 py-3 px-6 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono">
        <div>
          RailSync Enterprise &bull; Ministry of Railways, Government of India &bull; CRIS Platform v2.0
        </div>
        <div className="text-slate-400">
          Strictly for authorized Railway Operations personnel. Unauthorized access is punishable under Section 43/66 IT Act.
        </div>
      </footer>
    </div>
  );
};
