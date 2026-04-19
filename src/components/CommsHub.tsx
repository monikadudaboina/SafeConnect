import React, { useState, useEffect, useRef } from "react";
import { Send, User, Bot, Clock, Sparkles } from "lucide-react";
import { db } from "../lib/firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit } from "firebase/firestore";
import { Message } from "../types";
import { cn } from "../lib/utils";
import { generateQuickReplies } from "../lib/gemini";
interface CommsHubProps {
  incidentId: string;
  senderType?: "guest" | "staff" | "responder" | "system";
  senderName?: string;
  senderId?: string;
}

export const CommsHub: React.FC<CommsHubProps> = ({ 
  incidentId, 
  senderType = "staff", 
  senderName = "Responder",
  senderId = "Staff_User_Sim"
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, `incidents/${incidentId}/messages`),
      orderBy("timestamp", "asc"),
      limit(50)
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);

      // Trigger unique suggestion generation when a new message arrives and it's from the "other" side
      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg.senderType !== senderType) {
          handleGenerateSuggestions(msgs);
        }
      }
    });

    return unsub;
  }, [incidentId, senderType]);

  const handleGenerateSuggestions = async (msgs: Message[]) => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const context = msgs.slice(-4).map(m => `[${m.senderType}]: ${m.text}`).join(" | ");
      const replies = await generateQuickReplies(context, senderType);
      setSuggestions(replies);
    } catch (e) {
      console.error("AI Suggestion Error", e);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    try {
      await addDoc(collection(db, `incidents/${incidentId}/messages`), {
        text,
        senderId,
        senderName,
        senderType,
        timestamp: serverTimestamp(),
      });

      setSuggestions([]); // Clear suggestions after sending

      if (senderType === "guest") {
        setTimeout(async () => {
          await addDoc(collection(db, `incidents/${incidentId}/messages`), {
            text: "NODE ACK: SIGNAL RECEIVED. TACTICAL UNITS DEPLOYED. MAINTAIN POSITION.",
            senderId: "system",
            senderName: "SYSTEM PROTOCOL",
            senderType: "system",
            timestamp: serverTimestamp(),
          });
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(inputValue);
    setInputValue("");
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/20 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md">
      <div className="p-4 border-b border-white/5 bg-zinc-950/40 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
           <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-zinc-500 font-sans italic">Bridge Protocol 7</h3>
        </div>
        <span className="text-[9px] text-zinc-600 font-mono tracking-widest leading-none">AES-256 SECURED</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-hide">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={cn(
              "flex flex-col group",
              msg.senderType === 'system' ? "w-full text-center items-center" : "max-w-[85%]",
              msg.senderType === 'staff' ? "self-end items-end" : "self-start"
            )}
          >
            {msg.senderType !== 'system' && (
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="text-[9px] uppercase font-black text-zinc-500 tracking-widest">{msg.senderName}</span>
                <span className="text-[8px] font-mono text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
                  {msg.timestamp ? (msg.timestamp as any).toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "NOW"}
                </span>
              </div>
            )}
            
            <div className={cn(
              "px-4 py-3 rounded-2xl text-[13px] leading-relaxed relative",
              msg.senderType === 'staff' ? "bg-zinc-100 text-black rounded-tr-none font-medium" : 
              msg.senderType === 'system' ? "bg-red-600/5 text-red-500 border border-red-600/20 rounded-xl italic font-bold" : 
              "bg-zinc-900 text-zinc-300 rounded-tl-none border border-white/5"
            )}>
              {msg.senderType === 'system' && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#111] px-2 text-[8px] font-black tracking-[0.3em] text-red-600">PROTOCOL_ASSERTION</div>
              )}
              {msg.text}
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-4">
            <div className="w-10 h-10 border border-white/5 bg-zinc-900/40 rounded-full flex items-center justify-center text-zinc-700">
               <Send size={16} />
            </div>
            <p className="text-zinc-700 italic text-[10px] uppercase font-bold tracking-widest">Bridging secure mesh channel...</p>
          </div>
        )}
      </div>

      <div className="px-4 py-2 flex flex-col gap-2">
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendMessage(suggestion)}
                className="bg-zinc-900/80 hover:bg-zinc-800 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-white/5 text-zinc-400 hover:text-white transition-all active:scale-95 flex items-center gap-2"
              >
                <Sparkles size={10} className="text-blue-500" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 bg-zinc-950/60 border-t border-white/5 flex gap-2">
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Transmit signal..."
          className="flex-1 bg-zinc-900/50 border border-white/5 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-red-600/50 transition-all font-medium placeholder:text-zinc-700"
        />
        <button className="w-12 h-12 flex items-center justify-center bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-950/20 group">
          <Send size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </form>
    </div>
  );
};
