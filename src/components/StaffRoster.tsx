import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Users, Radio, ShieldCheck, Send } from "lucide-react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, query, addDoc, serverTimestamp } from "firebase/firestore";
import { Staff } from "../types";
import { cn } from "../lib/utils";

export const StaffRoster: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);

  useEffect(() => {
    // Attempt to find the most recent active incident for quick-scoping deployments
    const qInc = query(collection(db, "incidents"));
    const unsubInc = onSnapshot(qInc, (snap) => {
      const active = snap.docs.find(d => d.data().status === 'active');
      if (active) setActiveIncidentId(active.id);
    });

    const q = query(collection(db, "staff"));
    const unsub = onSnapshot(q, (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff)));
    });
    return () => {
      unsub();
      unsubInc();
    };
  }, []);

  const sendStaffDetails = async (member: Staff) => {
    if (!activeIncidentId) {
      alert("No active tactical bridge detected to receive personnel data.");
      return;
    }

    try {
      await addDoc(collection(db, `incidents/${activeIncidentId}/messages`), {
        text: `PERSONNEL DATA LINK: ${member.name} (${member.role}) deployed to Zone: Lobby Alpha. Vital Status: NOMINAL.`,
        senderId: "system",
        senderName: "PERSONNEL MESH",
        senderType: "system",
        timestamp: serverTimestamp(),
      });
      alert(`Tactical data for ${member.name} transmitted to active bridge.`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-zinc-950 min-h-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((member) => (
          <motion.div 
            key={member.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="tactical-card group relative p-6 space-y-4 hover:border-zinc-700 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center border border-white/5 overflow-hidden group-hover:border-blue-500/50 transition-colors">
                  <span className="text-xl font-black text-zinc-600 group-hover:text-blue-500">{member.name[0]}</span>
                </div>
                <div className={cn(
                  "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-zinc-950",
                  member.status === 'active' ? "bg-green-500" : "bg-zinc-700"
                )} />
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-black tracking-widest text-zinc-600 block leading-none mb-1">Grid ID</span>
                <span className="text-[10px] font-mono text-zinc-400">#PX-{member.id.toUpperCase().slice(0, 5)}</span>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-black uppercase italic tracking-tighter text-white group-hover:text-blue-400 transition-colors">{member.name}</h3>
              <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">{member.role}</p>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-4">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio size={12} className={cn(member.status === 'active' ? "text-red-500 animate-pulse" : "text-zinc-700")} />
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Lobby Alpha</span>
                  </div>
                  <div className={cn(
                    "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.2em] border",
                    member.status === 'active' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-zinc-900 border-white/5 text-zinc-700"
                  )}>
                    {member.status === 'active' ? "Ready" : "Standby"}
                  </div>
               </div>

               <button 
                  onClick={() => sendStaffDetails(member)}
                  className="w-full py-3 bg-zinc-900 rounded-xl border border-white/5 flex items-center justify-center gap-2 text-[9px] uppercase font-black tracking-[0.2em] text-zinc-500 hover:bg-white hover:text-black hover:border-white transition-all active:scale-95 shadow-lg shadow-black/20"
               >
                  <Send size={12} /> Transmit Tactical Data
               </button>
            </div>
          </motion.div>
        ))}
        {staff.length === 0 && (
          <div className="col-span-full py-20 tactical-card text-center border-dashed">
            <p className="text-zinc-700 text-[10px] uppercase font-black tracking-widest italic">Syncing mesh nodes for personnel...</p>
          </div>
        )}
      </div>
    </div>
  );
};
