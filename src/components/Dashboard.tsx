import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Activity, 
  AlertTriangle, 
  Map, 
  MessageSquare, 
  Shield, 
  LayoutDashboard, 
  Settings, 
  Users,
  CheckCircle2,
  Clock,
  TrendingDown
} from "lucide-react";
import { db } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot, limit, Timestamp } from "firebase/firestore";
import { Incident, Staff } from "../types";
import { cn } from "../lib/utils";
import { CommsHub } from "./CommsHub";
import { LiveMap } from "./LiveMap";
import { StaffRoster } from "./StaffRoster";
import { doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Staff Dashboard: Unified Crisis Command Center
 */
export const Dashboard: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({
    active: 0,
    pending: 0,
    resolvedToday: 7,
    avgTTC: "00:47" // Time-to-Certainty (Simulated for Demo)
  });

  useEffect(() => {
    const q = query(collection(db, "incidents"), orderBy("createdAt", "desc"), limit(20));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident));
      setIncidents(data);
      if (data.length > 0 && !selectedIncidentId) {
        setSelectedIncidentId(data[0].id);
      }
      setStats(prev => ({
        ...prev,
        active: data.filter(i => i.status === 'active').length,
        pending: data.filter(i => i.status === 'pending').length,
      }));
    });
    return unsub;
  }, [selectedIncidentId]);

  const handleQuickAction = async (type: string) => {
    if (!selectedIncidentId || isProcessing) return;
    setIsProcessing(true);
    
    try {
      let systemMessage = "";
      switch(type) {
        case 'escalate': systemMessage = "EMERGENCY: Incident escalated to 911 Dispatch. First Responders notified."; break;
        case 'sweep': systemMessage = "STAFF ALERT: Conducting floor sweep in Lobby Alpha. Stand by."; break;
        case 'unlock': systemMessage = "SYSTEM: Manual override triggered. All fire exits in Zone 4 unlocked."; break;
        case 'broadcast': systemMessage = "PA: Mass broadcast sent to all guest devices and corridor speakers."; break;
      }

      await addDoc(collection(db, `incidents/${selectedIncidentId}/messages`), {
        text: systemMessage,
        senderId: "system",
        senderName: "SYSTEM PROTOCOL",
        senderType: "system",
        timestamp: serverTimestamp(),
      });

      // Update incident if needed
      if (type === 'escalate') {
        await updateDoc(doc(db, "incidents", selectedIncidentId), {
          status: 'dispatched',
          updatedAt: serverTimestamp()
        });
      }

    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">
            {/* Escalation Bar */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-600/10 border border-red-600 rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-red-600/5 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              <p className="text-xs font-bold text-red-500 uppercase tracking-widest leading-relaxed">
                <strong>Auto-Escalation Protocol Active</strong> — {incidents.filter(i => i.status === 'active').length > 0 ? "Critical unacknowledged units detected" : "All units within response window"}
              </p>
              <div className="ml-auto text-[10px] font-mono text-zinc-500 uppercase tracking-widest"> Regional 911 Ready: SIM_ON </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Feed */}
              <div className="lg:col-span-8 flex flex-col gap-8">
                <section className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-600">Primary Incident Mesh</h2>
                    <span className="text-[10px] font-mono text-zinc-700">SOURCE: FIREBASE_RTDB_V1</span>
                  </div>

                  <div className="space-y-4">
                    <AnimatePresence>
                      {incidents.filter(i => i.status !== 'resolved').map((incident) => (
                        <IncidentCard 
                          key={incident.id} 
                          incident={incident} 
                          active={selectedIncidentId === incident.id}
                          onClick={() => setSelectedIncidentId(incident.id)}
                        />
                      ))}
                    </AnimatePresence>
                    {incidents.filter(i => i.status !== 'resolved').length === 0 && (
                      <div className="p-20 tactical-card text-center border-dashed">
                        <p className="text-zinc-600 text-xs italic tracking-widest leading-none">Scanning for distress signals...</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Right Column: Sensors & Comms */}
              <div className="lg:col-span-4 space-y-8">
                {/* IoT status */}
                <div className="tactical-card space-y-6">
                   <h3 className="text-[10px] uppercase font-black tracking-widest text-zinc-500 border-b border-white/5 pb-2">Sensor Matrix Status</h3>
                   <div className="space-y-4">
                      <SensorRow label="Smoke Detectors" status="Omni-Green" color="text-green-500" />
                      <SensorRow label="Gas Sensors" status="Triggered (F4)" color="text-red-500" />
                      <SensorRow label="Life-Safety Exits" status="Manual Override" color="text-orange-500" />
                      <SensorRow label="Emergency Lighting" status="Protocol Alpha" color="text-blue-500" />
                   </div>
                </div>

                {/* Selected Comms Segment */}
                <div className="space-y-4 h-[400px] flex flex-col">
                  {selectedIncidentId ? (
                    <CommsHub incidentId={selectedIncidentId} />
                  ) : (
                    <div className="flex-1 tactical-card flex items-center justify-center text-zinc-700 text-[10px] uppercase font-bold tracking-widest text-center italic leading-relaxed">
                      Select mesh unit<br/>to bridge communication
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="tactical-card bg-red-600/5 border-red-900/40 p-6 space-y-4">
                  <h3 className="text-[10px] uppercase font-black tracking-widest text-red-500 italic">Tactical Override Terminal</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <ActionButton label="911 Escalation" onClick={() => handleQuickAction('escalate')} disabled={isProcessing} color="red" />
                    <ActionButton label="Floor Sweep" onClick={() => handleQuickAction('sweep')} disabled={isProcessing} />
                    <ActionButton label="Mass Unlock" onClick={() => handleQuickAction('unlock')} disabled={isProcessing} />
                    <ActionButton label="PA Broadcast" onClick={() => handleQuickAction('broadcast')} disabled={isProcessing} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "incidents":
        return (
          <div className="flex-1 p-10 max-w-7xl mx-auto w-full space-y-8">
            <h2 className="text-3xl font-black italic tracking-tighter uppercase">Full Ops Archive</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {incidents.map(i => <IncidentCard key={i.id} incident={i} onClick={() => {}} />)}
            </div>
          </div>
        );
      case "map":
        return <div className="flex-1 h-full"><LiveMap /></div>;
      case "comms":
        return (
          <div className="flex-1 p-8 grid grid-cols-12 gap-8 h-full">
            <div className="col-span-4 flex flex-col gap-4 overflow-y-auto pr-4 scrollbar-thin">
               <h2 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-600 sticky top-0 py-2 bg-[#111] z-10">Network Bridges</h2>
               {incidents.map(i => (
                 <button 
                   key={i.id}
                   onClick={() => setSelectedIncidentId(i.id)}
                   className={cn(
                     "w-full p-6 text-left border rounded-2xl transition-all relative overflow-hidden",
                     selectedIncidentId === i.id 
                      ? "bg-red-600 border-red-500 shadow-xl shadow-red-950/40 text-white" 
                      : "bg-zinc-900 border-white/5 text-zinc-500 hover:bg-zinc-800"
                   )}
                 >
                   <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-mono tracking-tighter uppercase opacity-60">INC-{i.id.slice(0, 4)}</span>
                      {i.status === 'active' && <div className="w-1.5 h-1.5 rounded-full bg-red-400 group-hover:bg-white animate-pulse" />}
                   </div>
                   <h4 className="text-sm font-black uppercase italic tracking-tight leading-none">{i.type} Bridge</h4>
                   <p className="text-[10px] uppercase font-bold tracking-widest mt-2">{i.location}</p>
                 </button>
               ))}
            </div>
            <div className="col-span-8 tactical-card p-0 overflow-hidden h-[calc(100vh-120px)]">
              {selectedIncidentId && <CommsHub incidentId={selectedIncidentId} />}
            </div>
          </div>
        );
      case "staff":
        return (
          <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Tactical Personnel</h2>
                <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold mt-2">Zone assignments & biometrics</p>
              </div>
              <div className="flex gap-4">
                 <div className="tactical-card py-2 px-4 flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-600">READY UNITS: 12</span>
                 </div>
              </div>
            </div>
            <div className="tactical-card p-0 overflow-hidden">
               <StaffRoster />
            </div>
          </div>
        );
      case "ai":
        return (
          <div className="flex-1 p-8 space-y-8 max-w-5xl mx-auto w-full">
            <div className="text-center space-y-2">
               <h2 className="text-4xl font-black italic tracking-tighter uppercase">AI Triage Dashboard</h2>
               <p className="text-[10px] text-zinc-500 uppercase tracking-[0.5em] font-bold">Powered by Gemini 1.5 Pro</p>
            </div>
            
            <div className="tactical-card border-l-4 border-l-blue-500 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-widest">Global Intent Analysis</h3>
                  <span className="text-[8px] font-mono p-1 bg-blue-500/10 text-blue-500 rounded">MODELS/GEMINI-3-FLASH</span>
                </div>
                
                <div className="grid grid-cols-3 gap-6">
                   <MetricBox label="Avg Triage Latency" value="847ms" />
                   <MetricBox label="Intent Accuracy" value="99.2%" />
                   <MetricBox label="Language Support" value="120+" />
                </div>
                
                <div className="space-y-2">
                   <h4 className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest">Active Action Insights</h4>
                   <div className="flex flex-wrap gap-2">
                      <span className="bg-zinc-800 text-[9px] uppercase font-black tracking-widest px-3 py-1.5 rounded-full text-zinc-400">EVACUATION_PRIORITY</span>
                      <span className="bg-zinc-800 text-[9px] uppercase font-black tracking-widest px-3 py-1.5 rounded-full text-zinc-400">MEDICAL_DISPATCH_REQ</span>
                      <span className="bg-red-950/30 text-[9px] uppercase font-black tracking-widest px-3 py-1.5 rounded-full text-red-500 border border-red-500/10">LIFE_SAFETY_ALERT</span>
                   </div>
                </div>
            </div>
          </div>
        );
      case "readiness":
        return (
          <div className="flex-1 p-10 flex flex-col items-center justify-center text-center space-y-6">
             <div className="w-24 h-24 rounded-full bg-green-500/10 border-4 border-dashed border-green-500/30 flex items-center justify-center animate-spin-slow">
                <Shield size={48} className="text-green-500" />
             </div>
             <h2 className="text-2xl font-black italic uppercase tracking-tighter">Response Readiness</h2>
             <p className="max-w-sm text-zinc-500 text-xs font-mono leading-relaxed uppercase tracking-widest">
                All systems nominal. Personnel hydrated and staged. Logistics chain verified for Sector 7.
             </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-[#e0e0e0] font-sans selection:bg-red-500/30 overflow-hidden">
      {/* Sidebar - Precision feel */}
      <aside className="w-64 border-r border-white/5 flex flex-col p-4 gap-8 bg-zinc-950">
        <div className="flex items-center gap-3 px-2 py-4">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/40 border border-white/10 group">
            <Shield className="text-white group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tighter leading-none italic">SafeConnect</h1>
            <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-medium leading-none mt-1">Crisis Command</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          <NavItem icon={<Activity size={18} />} label="Home Hub" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
          <NavItem icon={<AlertTriangle size={18} />} label="Incident List" active={activeTab === "incidents"} onClick={() => setActiveTab("incidents")} />
          <NavItem icon={<Map size={18} />} label="Live Map" active={activeTab === "map"} onClick={() => setActiveTab("map")} />
          <NavItem icon={<MessageSquare size={18} />} label="Comms Hub" active={activeTab === "comms"} onClick={() => setActiveTab("comms")} />
          
          <div className="mt-8 mb-2 px-3 text-[9px] uppercase font-black text-zinc-700 tracking-[0.4em]">Resource Mesh</div>
          <NavItem icon={<Users size={18} />} label="Staff Roster" active={activeTab === "staff"} onClick={() => setActiveTab("staff")} />
          <NavItem icon={<Shield size={18} />} label="Response Readiness" active={activeTab === "readiness"} onClick={() => setActiveTab("readiness")} />
          <NavItem icon={<Activity size={18} />} label="AI Triage" active={activeTab === "ai"} onClick={() => setActiveTab("ai")} />
        </nav>

        <div className="mt-auto p-5 bg-zinc-900/30 rounded-3xl border border-white/5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-black font-mono text-zinc-500 uppercase tracking-widest">Encryption Verified</span>
          </div>
          <p className="text-[8px] text-zinc-700 font-mono leading-tight tracking-wider">
            NODES: CLOUD-RUN_01<br />
            LATENCY: 42ms<br />
            MODE: HIGH-STATE
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col bg-[#080808]">
        {/* Top Header / Stats */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-10 box-border">
          <div className="flex items-center gap-4">
             <div className="mesh-status">
               <span className="mesh-dot" /> Primary Data Link
             </div>
             <div className="h-4 w-[1px] bg-white/10" />
             <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">{activeTab.replace('_', ' ')}</span>
          </div>

          <div className="flex gap-10 items-center h-full">
            <StatItem value={stats.active} label="Critical" color="text-red-600" />
            <StatItem value={stats.pending} label="Awaiting ACK" color="text-orange-500" />
            <StatItem value={incidents.filter(i => i.status === 'resolved').length} label="Resolved" color="text-green-500" />
            <StatItem value={stats.avgTTC} label="Avg TTC" color="text-white" trend={<TrendingDown size={14} className="text-green-500" />} />
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

const MetricBox = ({ label, value }: { label: string, value: string }) => (
  <div className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5">
    <div className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest mb-1">{label}</div>
    <div className="text-2xl font-black italic tracking-tighter text-white">{value}</div>
  </div>
);

const SensorRow = ({ label, status, color }: { label: string, status: string, color: string }) => (
  <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest group">
    <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors">{label}</span>
    <span className={cn(color, "bg-zinc-800/50 px-2 py-0.5 rounded")}>{status}</span>
  </div>
);

const ActionButton = ({ label, onClick, disabled, color }: { label: string, onClick: () => void, disabled?: boolean, color?: 'red' }) => (
  <button 
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "p-3 rounded-xl font-black uppercase text-[9px] tracking-[0.2em] transition-all disabled:opacity-50 active:scale-95 border",
      color === 'red' 
        ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/20 hover:brightness-110" 
        : "bg-zinc-800 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-700"
    )}
  >
    {label}
  </button>
);

const NavItem = ({ icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-medium text-sm group",
      active ? "bg-red-600 text-white shadow-lg shadow-red-900/20" : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
    )}
  >
    <span className={cn(active ? "text-white" : "text-zinc-600 group-hover:text-zinc-400")}>{icon}</span>
    {label}
  </button>
);

const StatItem = ({ value, label, color, trend }: { value: any, label: string, color: string, trend?: any }) => (
  <div className="flex flex-col items-end">
    <div className={cn("text-2xl font-black tabular-nums tracking-tighter flex items-center gap-2", color)}>
      {value}
      {trend}
    </div>
    <div className="text-[10px] uppercase font-mono text-zinc-500">{label}</div>
  </div>
);

interface IncidentCardProps {
  incident: Incident;
  active?: boolean;
  onClick: () => void;
  key?: string | number;
}

const IncidentCard = ({ incident, active, onClick }: IncidentCardProps) => {
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});

  const toggleTask = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedTasks(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const resolveIncident = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, "incidents", incident.id), {
        status: 'resolved',
        updatedAt: serverTimestamp()
      });
      await addDoc(collection(db, `incidents/${incident.id}/messages`), {
        text: "UNIT CLEARED. INCIDENT RESOLVED BY COMMAND.",
        senderId: "system",
        senderName: "SYSTEM PROTOCOL",
        senderType: "system",
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      onClick={onClick}
      className={cn(
        "bg-zinc-900/40 border-l-4 rounded-r-2xl p-6 flex flex-col gap-4 transition-all hover:bg-zinc-800/40 cursor-pointer overflow-hidden relative group",
        active ? "ring-2 ring-red-600/50" : "",
        incident.status === 'resolved' ? "border-green-500 opacity-60" : 
        incident.severity > 7 ? "border-red-600 bg-red-950/10" : 
        incident.severity > 4 ? "border-orange-500" : "border-blue-500"
      )}
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-zinc-800 text-[10px] font-mono rounded-md uppercase text-zinc-400 tracking-tighter">
              ID: {incident.id.slice(0, 6)}
            </span>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest",
              incident.status === 'active' ? "text-red-500 animate-pulse" : 
              incident.status === 'resolved' ? "text-green-500" : "text-zinc-500"
            )}>
              • {incident.status}
            </span>
          </div>
          <h3 className="text-xl font-black uppercase italic tracking-tight">{incident.type} Detected</h3>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className="bg-red-600/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-lg flex flex-col items-center">
            <span className="text-lg font-black leading-none">{incident.severity}</span>
            <span className="text-[8px] uppercase font-bold tracking-widest leading-none mt-1">LVL</span>
          </div>
          {incident.status !== 'resolved' && (
            <button 
              onClick={resolveIncident}
              className="text-[8px] uppercase font-black tracking-widest bg-green-500 text-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Clear Signal
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">{incident.description}</p>

      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
          <MapPin size={12} /> {incident.location}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
          <Clock size={12} /> {incident.createdAt instanceof Timestamp ? incident.createdAt.toDate().toLocaleTimeString() : 'NOW'}
        </div>
      </div>

      {incident.actions && incident.actions.length > 0 && (
        <div className="pt-4 border-t border-white/5 flex flex-wrap gap-2">
          {incident.actions.map((action, idx) => (
            <button 
              key={idx} 
              onClick={(e) => toggleTask(idx, e)}
              className={cn(
                "text-[9px] uppercase font-bold px-2 py-1 rounded-md border transition-all flex items-center gap-2",
                completedTasks[idx] 
                  ? "bg-green-500/20 border-green-500/40 text-green-500 line-through" 
                  : "bg-white/5 border-white/5 text-zinc-300 hover:border-zinc-500"
              )}
            >
              <div className={cn("w-1.5 h-1.5 rounded-full", completedTasks[idx] ? "bg-green-500" : "bg-zinc-600")} />
              TASK: {action}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

const MapPin = ({ size, className }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
