import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Copy, Mail } from "lucide-react";
import api from "../lib/api";

const SERVICES = ["Fotografie", "Videografie", "Dronefotografie & FPV", "Automotive", "Portretfotografie", "Bedrijfsfotografie", "Social Media Content", "Maatwerk"];

export default function AITools() {
  const [tab, setTab] = useState("quote");
  return (
    <div className="space-y-6" data-testid="admin-ai-tools">
      <div className="flex gap-2 border-b border-amber-500/10">
        {[["quote", "Offerte Generator"], ["caption", "Portfolio Captions"]].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            data-testid={`ai-tab-${k}`}
            className={`px-4 py-2 text-xs tracking-widest uppercase border-b-2 -mb-px transition-colors ${tab === k ? "border-[#D4AF37] text-[#D4AF37]" : "border-transparent text-zinc-400 hover:text-zinc-200"}`}
          >{l}</button>
        ))}
      </div>
      {tab === "quote" ? <QuoteTool /> : <CaptionTool />}
    </div>
  );
}

function QuoteTool() {
  const [form, setForm] = useState({ client_name: "", service: SERVICES[0], wishes: "", budget: "" });
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!form.wishes.trim()) return toast.error("Beschrijf de wensen van de klant.");
    setBusy(true); setResult("");
    try {
      const res = await api.post("/admin/ai/quote", form);
      setResult(res.data.text || "");
    } catch { toast.error("Kon geen offerte genereren."); }
    finally { setBusy(false); }
  };

  const copy = () => { navigator.clipboard.writeText(result); toast.success("Gekopieerd"); };
  const mailIt = () => {
    const subject = encodeURIComponent(`Offerte — ${form.service} — KeldersVisuals`);
    const body = encodeURIComponent(result);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card-luxe p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-[#D4AF37]" />
          <p className="eyebrow">Klantgegevens</p>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">Naam klant</label>
          <input className="input-luxe py-2 text-sm" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} data-testid="quote-name" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">Dienst</label>
          <select className="input-luxe py-2 text-sm" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} data-testid="quote-service">
            {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">Wensen</label>
          <textarea rows={5} className="input-luxe py-2 text-sm resize-none" value={form.wishes} onChange={(e) => setForm({ ...form, wishes: e.target.value })} placeholder="Bijv. 'Bedrijfsvideo van 2 min voor website + korte social cuts, in eigen kantoor, half dag opnamen'" data-testid="quote-wishes" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">Budget (optioneel)</label>
          <input className="input-luxe py-2 text-sm" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="€1500 - €2500" data-testid="quote-budget" />
        </div>
        <button onClick={run} disabled={busy} className="btn-gold w-full justify-center" data-testid="quote-generate">
          <Sparkles size={14} /> {busy ? "Bezig…" : "Genereer offerte"}
        </button>
      </div>

      <div className="card-luxe p-6" data-testid="quote-result-card">
        <div className="flex justify-between items-center mb-3">
          <p className="eyebrow">Offerte</p>
          {result && (
            <div className="flex gap-2">
              <button onClick={copy} className="text-xs text-zinc-400 hover:text-[#D4AF37]" data-testid="quote-copy"><Copy size={12} /></button>
              <button onClick={mailIt} className="text-xs text-zinc-400 hover:text-[#D4AF37]" data-testid="quote-mail"><Mail size={12} /></button>
            </div>
          )}
        </div>
        {result ? (
          <div className="whitespace-pre-wrap text-sm text-zinc-200 leading-relaxed" data-testid="quote-result-text">{result}</div>
        ) : (
          <p className="text-zinc-500 text-sm italic">Nog geen offerte gegenereerd.</p>
        )}
      </div>
    </div>
  );
}

function CaptionTool() {
  const [context, setContext] = useState("");
  const [captions, setCaptions] = useState([]);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!context.trim()) return toast.error("Beschrijf de foto/video.");
    setBusy(true); setCaptions([]);
    try {
      const res = await api.post("/admin/ai/caption", { context });
      setCaptions(res.data.captions || []);
    } catch { toast.error("Kon geen captions genereren."); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card-luxe p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-[#D4AF37]" />
          <p className="eyebrow">Foto / Video Beschrijving</p>
        </div>
        <textarea
          rows={8}
          className="input-luxe py-2 text-sm resize-none"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Bijv. 'Cinematische BMW M3 shoot bij zonsondergang aan de Maasboulevard, tegenlicht op de motorkap, dramatische wolken'"
          data-testid="caption-input"
        />
        <button onClick={run} disabled={busy} className="btn-gold w-full justify-center" data-testid="caption-generate">
          <Sparkles size={14} /> {busy ? "Bezig…" : "Genereer 3 captions"}
        </button>
      </div>

      <div className="space-y-3" data-testid="caption-results">
        {busy && <p className="text-zinc-500 text-sm">AI werkt…</p>}
        {!busy && captions.length === 0 && (
          <div className="card-luxe p-6"><p className="text-zinc-500 text-sm italic">Nog geen captions gegenereerd.</p></div>
        )}
        {captions.map((c, i) => (
          <div key={i} className="card-luxe p-5" data-testid={`caption-item-${i}`}>
            <p className="eyebrow mb-2">{c.style}</p>
            <p className="text-sm text-zinc-100 leading-relaxed mb-3">{c.text}</p>
            <button
              onClick={() => { navigator.clipboard.writeText(c.text); toast.success("Gekopieerd"); }}
              className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1"
              data-testid={`caption-copy-${i}`}
            >
              <Copy size={11} /> Kopieer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
