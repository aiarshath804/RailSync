import React, { useState } from "react";
import { 
  Bell, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Trash2, 
  CheckCheck, 
  Volume2, 
  VolumeX, 
  Clock,
  Radio
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "critical" | "warning" | "info" | "success";
  sector: string;
  read: boolean;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  onAcknowledgeAlert?: (alert: NotificationItem) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  setNotifications,
  onAcknowledgeAlert
}) => {
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">("all");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter(n => {
    if (filter === "all") return true;
    return n.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const toggleRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: !n.read } : n));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getTypeIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "critical":
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case "info":
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getTypeBadge = (type: NotificationItem["type"]) => {
    switch (type) {
      case "critical":
        return "bg-rose-50 border-rose-200 text-rose-700";
      case "warning":
        return "bg-amber-50 border-amber-200 text-amber-800";
      case "success":
        return "bg-emerald-50 border-emerald-200 text-emerald-800";
      case "info":
      default:
        return "bg-blue-50 border-blue-200 text-blue-700";
    }
  };

  return (
    <AnimatePresence>
      <div id="notifications-modal-backdrop" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl max-w-2xl w-full p-6 text-slate-900 shadow-2xl relative border border-slate-300 flex flex-col max-h-[85vh] font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-50 text-blue-900 rounded-xl border border-blue-200">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-black text-slate-900 font-serif uppercase tracking-tight">
                    Live Telemetry & Operational Alerts
                  </h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-rose-600 text-white font-bold px-2 py-0.5 rounded-full font-mono">
                      {unreadCount} NEW
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  Real-time network events, safety interlocks, and subsystem diagnostics
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "Mute telemetry chimes" : "Unmute telemetry chimes"}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  soundEnabled 
                    ? "bg-blue-50 border-blue-200 text-blue-900" 
                    : "bg-slate-100 border-slate-200 text-slate-400"
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </motion.button>

              <button 
                onClick={onClose} 
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter Bar & Action Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-2 border-b border-slate-200">
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 font-mono">
              {(["all", "critical", "warning", "info"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg uppercase transition cursor-pointer ${
                    filter === tab 
                      ? "bg-white text-blue-900 shadow-xs border border-slate-200" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab === "all" ? `All (${notifications.length})` : tab}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2 font-mono">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center space-x-1 text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark All Read</span>
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="flex items-center space-x-1 text-[11px] px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
            {filteredNotifications.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center space-y-2 text-slate-400 font-mono">
                <Radio className="w-8 h-8 opacity-40 text-blue-900" />
                <p className="text-xs font-bold text-slate-700">No active live telemetry alerts.</p>
                <p className="text-[11px] text-slate-400">All live block safety interlocks are operating within nominal limits.</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isExpanded = expandedId === notif.id;
                return (
                  <motion.div
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      notif.read 
                        ? "bg-slate-50/70 border-slate-200 opacity-80 hover:opacity-100" 
                        : "bg-blue-50/50 border-blue-200 shadow-xs"
                    }`}
                    onClick={() => setExpandedId(isExpanded ? null : notif.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5 p-1.5 rounded-lg bg-white border border-slate-200 shrink-0">
                          {getTypeIcon(notif.type)}
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-900">{notif.title}</span>
                            <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono border ${getTypeBadge(notif.type)}`}>
                              {notif.sector}
                            </span>
                            {!notif.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                            {notif.message}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-1.5 shrink-0">
                        <span className="text-[9px] text-slate-500 font-mono flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{notif.timestamp}</span>
                        </span>
                        
                        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleRead(notif.id)}
                            title={notif.read ? "Mark as unread" : "Mark as read"}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition cursor-pointer"
                          >
                            <CheckCircle2 className={`w-3.5 h-3.5 ${notif.read ? "text-blue-600" : "text-slate-300"}`} />
                          </button>
                          <button
                            onClick={() => deleteNotification(notif.id)}
                            title="Delete alert"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[10px] font-mono text-slate-500"
                      >
                        <div>
                          <span>Alert ID: <strong className="text-slate-900">{notif.id}</strong></span> • 
                          <span className="ml-1.5">Priority Level: <strong className="text-slate-900 uppercase">{notif.type}</strong></span>
                        </div>
                        {onAcknowledgeAlert && (
                          <button
                            onClick={() => onAcknowledgeAlert(notif)}
                            className="px-2.5 py-1 rounded bg-blue-900 text-white font-bold hover:bg-blue-800 transition cursor-pointer"
                          >
                            Inspect Affected Block
                          </button>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>System Status: <strong className="text-emerald-700">LIVE TELEMETRY ACTIVE</strong></span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
