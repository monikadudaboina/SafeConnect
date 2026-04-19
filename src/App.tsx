import React, { useState, useEffect } from "react";
import { StressUI } from "./components/StressUI";
import { Dashboard } from "./components/Dashboard";
import { auth } from "./lib/firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { motion, AnimatePresence } from "motion/react";
import { Eye, ShieldCheck, LogIn, LogOut } from "lucide-react";

export default function App() {
  const [pov, setPov] = useState<"guest" | "staff">("staff");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-black min-h-screen">
      {/* Role Selection Overlay (Initial or Switcher) */}
      <div className="fixed bottom-6 left-6 z-50 flex gap-2 bg-zinc-900 border border-white/10 p-2 rounded-2xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-red-600/5 pointer-events-none" />
        <button 
          onClick={() => setPov("guest")}
          className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${pov === "guest" ? "bg-red-600 text-white shadow-lg shadow-red-900/40" : "text-zinc-500 hover:text-white"}`}
        >
          <Eye size={12} /> Guest Portal
        </button>
        <button 
          onClick={() => setPov("staff")}
          className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${pov === "staff" ? "bg-red-600 text-white shadow-lg shadow-red-900/40" : "text-zinc-500 hover:text-white"}`}
        >
          <ShieldCheck size={12} /> Staff Hub
        </button>
      </div>

      <AnimatePresence mode="wait">
        {pov === "guest" ? (
          <motion.div
            key="guest"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-screen overflow-hidden"
          >
            <StressUI />
          </motion.div>
        ) : (
          <motion.div
            key="staff"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-screen overflow-hidden"
          >
            {user ? (
              <Dashboard />
            ) : (
              <div className="h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#000_100%)]">
                <div className="max-w-md w-full tactical-card border-none bg-zinc-900/80 backdrop-blur-xl p-10 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-600 to-transparent" />
                  <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-900/40 border-2 border-white/10">
                    <ShieldCheck size={32} className="text-white" />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-2 uppercase italic tracking-tighter">Mission Control</h2>
                  <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-[0.3em] mb-10 leading-relaxed">
                    Identity Verification Required<br />Secure Protocol: AES-256
                  </p>
                  <button 
                    onClick={handleLogin}
                    className="w-full py-4 bg-white text-black rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-red-600 hover:text-white transition-all active:scale-95 group"
                  >
                    <LogIn size={16} className="group-hover:translate-x-1 transition-transform" /> 
                    Authenticate Profile
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout button if staff and user logged in */}
      {user && pov === "staff" && (
        <button 
          onClick={() => signOut(auth)}
          className="fixed top-6 right-6 z-50 p-3 bg-zinc-800 text-zinc-400 rounded-full hover:text-white transition-all border border-white/5"
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      )}
    </div>
  );
}
