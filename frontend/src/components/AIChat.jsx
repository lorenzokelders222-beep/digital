import { useEffect, useRef, useState } from "react";
import { MessageSquare, X, Send, Sparkles } from "lucide-react";
import { API } from "../lib/api";

const STORAGE_KEY = "kv_chat_history";
const SESSION_KEY = "kv_chat_session";

function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `kv_${Math.random().toString(36).slice(2, 14)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const OPENERS = [
  "Wat kost een bedrijfsvideo?",
  "Kunnen jullie ook FPV drone shoots doen?",
  "Beschikbaarheid voor volgende maand?",
  "Wat is inbegrepen bij portretshoots?",
];

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bodyRef = useRef(null);
  const sessionId = useRef(getSessionId());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || streaming) return;
    setInput("");
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { role: "user", text: q }, { role: "assistant", text: "" }]);
    setStreaming(true);

    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, history, session_id: sessionId.current }),
      });
      if (!res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        for (const ev of events) {
          const line = ev.replace(/^data:\s?/, "").trim();
          if (!line || line === "[DONE]") continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.delta) {
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { ...copy[copy.length - 1], text: copy[copy.length - 1].text + parsed.delta };
                return copy;
              });
            } else if (parsed.error) {
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { ...copy[copy.length - 1], text: parsed.error };
                return copy;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", text: "Sorry, ik ben even offline. App gerust rechtstreeks via WhatsApp." };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <>
      {/* Toggle button — positioned above WhatsApp */}
      <button
        onClick={() => setOpen((o) => !o)}
        data-testid="ai-chat-toggle"
        aria-label="AI Assistent"
        className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-[#0A0A0C] border border-[#D4AF37] text-[#D4AF37] flex items-center justify-center shadow-lg hover:bg-[#D4AF37] hover:text-black transition-all"
      >
        {open ? <X size={20} /> : <Sparkles size={20} />}
      </button>

      {open && (
        <div
          data-testid="ai-chat-panel"
          className="fixed bottom-44 right-6 z-40 w-[calc(100vw-3rem)] sm:w-96 max-w-md h-[520px] max-h-[70vh] bg-[#121216] border border-amber-500/30 shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-amber-500/15 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center">
              <Sparkles size={14} className="text-[#D4AF37]" />
            </div>
            <div className="flex-1">
              <p className="font-serif text-sm">KeldersVisuals · AI</p>
              <p className="text-[10px] text-zinc-500 tracking-widest uppercase">Vraag maar raak</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white"><X size={16} /></button>
          </div>

          {/* Messages */}
          <div ref={bodyRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 text-sm">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Hallo! Ik ben de digitale assistent van KeldersVisuals. Waarmee kan ik je helpen?
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  {OPENERS.map((o, i) => (
                    <button
                      key={i}
                      onClick={() => send(o)}
                      data-testid={`ai-chat-opener-${i}`}
                      className="text-left text-xs px-3 py-2 border border-amber-500/20 text-zinc-300 hover:border-[#D4AF37]/60 hover:text-[#D4AF37] transition-all"
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] px-4 py-3 ${
                  m.role === "user"
                    ? "ml-auto bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-zinc-100"
                    : "bg-[#18181E] border border-amber-500/10 text-zinc-200"
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">
                  {m.text}
                  {streaming && i === messages.length - 1 && m.role === "assistant" && (
                    <span className="inline-block w-1.5 h-3 bg-[#D4AF37] ml-1 animate-pulse" />
                  )}
                </p>
              </div>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="p-4 border-t border-amber-500/15 flex gap-2"
          >
            <input
              data-testid="ai-chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Stel je vraag…"
              disabled={streaming}
              className="input-luxe flex-1 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              data-testid="ai-chat-send"
              className="w-11 h-11 flex items-center justify-center bg-[#D4AF37] text-black hover:bg-[#E2C044] transition-colors disabled:opacity-30"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
