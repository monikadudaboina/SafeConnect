import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { MapPin, Navigation, Compass, Layers } from "lucide-react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Incident } from "../types";
import { cn } from "../lib/utils";

export const LiveMap: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedFloor, setSelectedFloor] = useState(1);

  useEffect(() => {
    const q = query(collection(db, "incidents"), where("status", "==", "active"));
    const unsub = onSnapshot(q, (snapshot) => {
      setIncidents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident)));
    });
    return unsub;
  }, []);

  // Simulated coordinate mapping for the demo floor plan
  const getCoordinates = (location: string) => {
    const loc = location.toLowerCase();
    if (loc.includes('lobby')) return { x: '45%', y: '65%' };
    if (loc.includes('room 402')) return { x: '75%', y: '30%' };
    if (loc.includes('kitchen')) return { x: '30%', y: '40%' };
    if (loc.includes('elevator')) return { x: '50%', y: '50%' };
    return { x: '20%', y: '20%' };
  };

  return (
    <div className="flex flex-col gap-6 h-full p-8 bg-black">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-4xl font-black tracking-tighter italic uppercase text-white leading-none">Live Visual Map</h2>
          <p className="text-[10px] text-zinc-600 uppercase tracking-[0.3em] font-bold mt-2">Spatial Incident Tracking & Evacuation Overlays</p>
        </div>
        <div className="flex gap-3 bg-zinc-900/50 p-2 rounded-2xl border border-white/5 shadow-xl">
          {[1, 2, 3, 4].map(f => (
            <button 
              key={f}
              onClick={() => setSelectedFloor(f)}
              className={cn(
                "w-10 h-10 rounded-xl font-bold text-xs font-mono transition-all border",
                selectedFloor === f 
                  ? "bg-red-600 text-white border-red-500 shadow-lg shadow-red-950/40" 
                  : "bg-zinc-950 text-zinc-600 border-white/5 hover:text-zinc-300"
              )}
            >
              F{f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 relative bg-zinc-950 border border-white/5 rounded-[40px] overflow-hidden shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] flex items-center justify-center p-12 group/map">
        {/* Decorative Grid Overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '100px 100px' }} />
        
        {/* Architectural Floor Plan SVG */}
        <div className="w-full h-full relative flex items-center justify-center max-w-[800px] max-h-[600px]">
          <svg className="w-full h-full text-zinc-900 transition-opacity group-hover/map:opacity-60 duration-1000" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="800" height="600" fill="transparent" />
            
            {/* Main Outer Walls */}
            <path d="M50 50H750V550H50V50Z" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
            
            {/* Structural Columns */}
            {[50, 400, 750].map(x => [50, 300, 550].map(y => (
              <rect key={`${x}-${y}`} x={x-5} y={y-5} width={10} height={10} fill="currentColor" />
            )))}

            {/* Hallways & Rooms */}
            <g stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" opacity="0.5">
              <path d="M50 300H750M400 50V550" />
            </g>

            {/* Room Blocks */}
            <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
              {/* Sector 1: Top Left - Admin/Security */}
              <rect x="100" y="100" width="120" height="150" className="fill-zinc-900/50" />
              <rect x="220" y="100" width="80" height="50" className="fill-zinc-900/50" />
              <rect x="220" y="150" width="80" height="100" className="fill-zinc-900/50" />
              
              {/* Sector 2: Top Right - High Occupancy */}
              <rect x="480" y="100" width="120" height="150" className="fill-zinc-900/50" />
              <rect x="600" y="100" width="100" height="75" className="fill-zinc-900/50" />
              <rect x="600" y="175" width="100" height="75" className="fill-zinc-900/50" />

              {/* Sector 3: Bottom Left - Services */}
              <rect x="100" y="350" width="120" height="150" className="fill-zinc-900/50" />
              <rect x="220" y="350" width="80" height="150" className="fill-zinc-900/50" />

              {/* Sector 4: Bottom Right - Kitchen/Lobby */}
              <rect x="480" y="350" width="220" height="150" className="fill-zinc-900/50" />
            </g>

            {/* Labels */}
            <g fill="currentColor" fontSize="7" fontWeight="900" textAnchor="middle" opacity="0.4" className="font-mono uppercase tracking-tighter">
              <text x="160" y="180">SEC_HQ_5A</text>
              <text x="260" y="130">COMMS</text>
              <text x="260" y="200">BRIDGE</text>
              <text x="540" y="180">ROOM_402</text>
              <text x="650" y="140">SUITE_B1</text>
              <text x="650" y="210">SUITE_B2</text>
              <text x="160" y="430">SERVICE_BAY</text>
              <text x="590" y="430">GRAND_LOBBY</text>
              <text x="400" y="350" className="fill-zinc-500">ELEV_CORE_01</text>
            </g>

            {/* Core Elevator Circle */}
            <circle cx="400" cy="300" r="40" stroke="currentColor" strokeWidth="2" />
            <path d="M380 300H420M400 280V320" stroke="currentColor" strokeWidth="1" />
          </svg>

          {/* Dynamic Markers Overlay (inside the container relative to SVG) */}
          <div className="absolute inset-0">
            {incidents.map((incident) => {
              const pos = getCoordinates(incident.location);
              return (
                <motion.div
                  key={incident.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{ left: pos.x, top: pos.y }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group z-20"
                >
                  <div className="relative">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center animate-ping absolute inset-0 opacity-20",
                      incident.severity > 7 ? "bg-red-500" : "bg-orange-500"
                    )} />
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center shadow-2xl relative cursor-pointer group-hover:scale-110 transition-transform border border-white/20",
                      incident.severity > 7 ? "bg-red-600 shadow-red-950/40" : "bg-orange-600 shadow-orange-950/40"
                    )}>
                      <MapPin size={18} className="text-white" />
                    </div>

                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-64 tactical-card bg-zinc-900 border-none shadow-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-30 scale-95 group-hover:scale-100 origin-top">
                      <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Signal: {incident.type}</div>
                        <div className="px-1.5 py-0.5 bg-red-600 text-[8px] font-black text-white rounded">SEV: {incident.severity}</div>
                      </div>
                      <div className="text-sm font-black italic text-white mb-2">{incident.location}</div>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed mb-3">{incident.description}</p>
                      
                      <div className="pt-2 border-t border-white/5 flex gap-2">
                         <div className="text-[8px] font-black text-zinc-600 uppercase">Status: <span className="text-red-600">{incident.status}</span></div>
                         <div className="text-[8px] font-black text-zinc-600 uppercase ml-auto">ID: {incident.id.slice(0, 5)}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-10 left-10 flex flex-col gap-4">
          <LegendItem color="bg-red-600" label="Critical Signal" />
          <LegendItem color="bg-orange-600" label="Active Response" />
        </div>

        {/* Map Controls */}
        <div className="absolute bottom-10 right-10 flex flex-col gap-3">
          <MapBtn icon={<Navigation size={18} />} />
          <MapBtn icon={<Compass size={18} />} />
          <MapBtn icon={<Layers size={18} />} />
        </div>
      </div>
    </div>
  );
};

const LegendItem = ({ color, label }: { color: string, label: string }) => (
  <div className="flex items-center gap-3 bg-zinc-900/40 backdrop-blur-md py-1.5 px-3 rounded-full border border-white/5 shadow-xl">
    <div className={cn("w-2 h-2 rounded-full", color, "animate-pulse")} />
    <span className="text-[9px] uppercase font-black text-zinc-500 tracking-[0.2em]">{label}</span>
  </div>
);

const MapBtn = ({ icon }: { icon: any }) => (
  <button className="w-12 h-12 flex items-center justify-center bg-zinc-900/60 backdrop-blur-md text-zinc-500 rounded-2xl hover:text-white hover:bg-red-600 transition-all border border-white/5 shadow-2xl active:scale-95">
    {icon}
  </button>
);
