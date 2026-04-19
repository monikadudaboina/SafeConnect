import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, MapPin, Mic, Send, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { triageEmergency, translateMessage, transcribeAudio } from "../lib/gemini";
import { cn } from "../lib/utils";
import { CommsHub } from "./CommsHub";

/**
 * Stress UI: High-contrast SOS interface for guests
 */
export const StressUI: React.FC = () => {
  const [isReporting, setIsReporting] = useState(false);
  const [reportValue, setReportValue] = useState("");
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "recording" | "triaging" | "sent">("idle");
  const [location, setLocation] = useState("Detecting...");
  
  const [isMicActive, setIsMicActive] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`),
        () => setLocation("Room 402 (Fallback)")
      );
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(",")[1];
          setStatus("triaging");
          try {
            const transcription = await transcribeAudio(base64Audio, "audio/webm");
            setReportValue(transcription);
            await processEmergency(transcription);
          } catch (e) {
            console.error("Transcription error", e);
            setStatus("idle");
          }
        };
      };

      mediaRecorder.current.start();
      setIsMicActive(true);
    } catch (e) {
      console.error("Mic access denied", e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.stop();
      setIsMicActive(false);
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const processEmergency = async (rawInput: string) => {
    setStatus("triaging");
    try {
      // 1. Translate to English as requested
      const translated = await translateMessage(rawInput, "English");
      
      // 2. Triage the translated message
      const triage = await triageEmergency(translated);
      
      const docRef = await addDoc(collection(db, "incidents"), {
        ...triage,
        severity: Math.round(triage.severity || 5), // Force integer for firestore rules
        status: "active",
        reportedBy: "Guest_User_Sim",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Add initial acknowledgment protocol message
      await addDoc(collection(db, `incidents/${docRef.id}/messages`), {
        text: "SIGNAL_LOCK: SOS INTENT VERIFIED. TACTICAL BRIDGE ESTABLISHED. ALL_UNITS_ALERTED.",
        senderId: "system",
        senderName: "SYSTEM PROTOCOL",
        senderType: "system",
        timestamp: serverTimestamp(),
      });

      // AI alerting all staff (represented by a broadcast message)
      await addDoc(collection(db, `incidents/${docRef.id}/messages`), {
        text: "AI_BROADCAST: Emergency packets distributed to all staff mobile units via secure mesh.",
        senderId: "system",
        senderName: "AI COMMAND",
        senderType: "system",
        timestamp: serverTimestamp(),
      });

      setActiveIncidentId(docRef.id);
      setStatus("sent");
    } catch (error: any) {
      console.error("Response failed", error);
      alert(`Signal Transmission Failed: ${error.message || "Network Error"}. Please check your connection.`);
      setStatus("idle");
    }
  };

  const handleSOS = async () => {
    if (!reportValue.trim()) {
      alert("Please provide a tactical description or use voice input.");
      return;
    }
    await processEmergency(reportValue);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#E24B4A 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <AnimatePresence mode="wait">
        {!isReporting ? (
          <motion.div
            key="sos-home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-12"
          >
            <div className="text-center space-y-2">
              <h2 className="text-[10px] uppercase font-black tracking-[0.5em] text-red-600 animate-pulse">Emergency Signal Standby</h2>
              <p className="text-zinc-500 text-xs">Tap for immediate tactical deployment</p>
            </div>

            <button
              onClick={() => setIsReporting(true)}
              className="sos-btn-tactical"
            >
              <ShieldAlert size={60} strokeWidth={2} className="shadow-red-500 drop-shadow-lg" />
              <span className="text-4xl tracking-tighter uppercase italic mt-2">SOS</span>
              <span className="text-[10px] opacity-60 tracking-[0.3em] font-normal">Location: {location}</span>
            </button>

            <div className="flex gap-4">
              <div className="mesh-status">
                <span className="mesh-dot" /> Mesh Online
              </div>
              <div className="mesh-status">
                <span className="mesh-dot bg-zinc-600" /> Bluetooth Relay Ready
              </div>
            </div>
          </motion.div>
        ) : activeIncidentId ? (
          <motion.div
            key="active-incident"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md flex flex-col gap-6 relative z-10"
          >
            <div className="tactical-card border-none bg-zinc-900 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                  <ShieldCheck size={28} className="text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-tighter text-white">Help is on the way</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-none mt-1">First Responded Dispatched</p>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-white/5 space-y-2">
                <div className="flex justify-between text-[8px] uppercase font-bold tracking-widest">
                  <span className="text-zinc-500">Security Team</span>
                  <span className="text-green-500">Approaching Grid</span>
                </div>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "85%" }}
                    transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
                    className="h-full bg-green-500" 
                  />
                </div>
              </div>
            </div>

            <div className="tactical-card border-none bg-zinc-900 border-t-2 border-t-red-600 h-[350px] flex flex-col p-0 overflow-hidden">
               <CommsHub 
                incidentId={activeIncidentId} 
                senderType="guest" 
                senderName="Distressed Guest" 
                senderId="Guest_Anonymous_Sim"
              />
            </div>

            <button 
              onClick={() => {
                setIsReporting(false);
                setActiveIncidentId(null);
                setStatus("idle");
                setReportValue("");
              }}
              className="py-4 bg-zinc-900/50 border border-white/5 text-zinc-600 font-black text-[10px] uppercase tracking-[0.3em] rounded-xl hover:text-white transition-all hover:bg-zinc-800"
            >
              Cancel Alert Signal
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="report-card"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-sm flex flex-col gap-8 relative z-10"
          >
            <div className="text-center">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Declare Incident Type</h2>
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest mt-1">Select one for priority routing</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setReportValue("Fire Emergency")}
                className="group flex flex-col items-center justify-center gap-3 p-6 bg-zinc-900 rounded-2xl border border-white/5 hover:border-red-600/50 hover:bg-zinc-800 transition-all active:scale-95"
              >
                <div className="text-zinc-600 group-hover:text-red-500 transition-colors"><ShieldAlert size={20} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white">Fire / Smoke</span>
              </button>
              <button 
                onClick={() => setReportValue("Medical Emergency")}
                className="group flex flex-col items-center justify-center gap-3 p-6 bg-zinc-900 rounded-2xl border border-white/5 hover:border-red-600/50 hover:bg-zinc-800 transition-all active:scale-95"
              >
                <div className="text-zinc-600 group-hover:text-red-500 transition-colors"><AlertCircle size={20} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white">Medical Hub</span>
              </button>
              <button 
                onClick={() => setReportValue("Security Threat")}
                className="group flex flex-col items-center justify-center gap-3 p-6 bg-zinc-900 rounded-2xl border border-white/5 hover:border-red-600/50 hover:bg-zinc-800 transition-all active:scale-95"
              >
                <div className="text-zinc-600 group-hover:text-red-500 transition-colors"><ShieldAlert size={20} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white">Security Risk</span>
              </button>
              <button 
                onClick={() => setReportValue("Other Incident")}
                className="group flex flex-col items-center justify-center gap-3 p-6 bg-zinc-900 rounded-2xl border border-white/5 hover:border-red-600/50 hover:bg-zinc-800 transition-all active:scale-95"
              >
                <div className="text-zinc-600 group-hover:text-red-500 transition-colors"><ShieldAlert size={20} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white">Other Event</span>
              </button>
            </div>

            <div className="relative group">
              <input
                className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-5 pr-24 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-all placeholder:text-zinc-700"
                placeholder="Briefly describe the situation..."
                value={reportValue}
                onChange={(e) => setReportValue(e.target.value)}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  className={cn(
                    "p-3 rounded-xl transition-all active:scale-95",
                    isMicActive ? "bg-red-600 text-white animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.4)]" : "bg-zinc-800 text-zinc-500 hover:text-white"
                  )}
                >
                  <Mic size={20} />
                </button>
                <div className="flex flex-col items-center">
                  <div className={cn("w-1.5 h-1.5 rounded-full mb-1", isMicActive ? "bg-red-600 animate-pulse" : "bg-zinc-800")} />
                  <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{isMicActive ? "REC" : "VOX"}</span>
                </div>
              </div>
            </div>

            <button
              disabled={status === "triaging"}
              onClick={handleSOS}
              className="w-full py-5 bg-red-600 rounded-2xl font-black uppercase tracking-[0.3em] text-[12px] shadow-lg shadow-red-900/40 border border-white/10 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {status === "triaging" ? "AI Triage Active..." : "Transmit SOS Signal"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
