import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, RefreshCcw, MessageCircle, Mail, Sparkles, Star } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import AITools from "../components/AITools";
import ReviewsAdmin from "../components/ReviewsAdmin";

const STATUS_OPTIONS = [
  { v: "new", label: "Nieuw" },
  { v: "confirmed", label: "Bevestigd" },
  { v: "completed", label: "Afgerond" },
  { v: "cancelled", label: "Geannuleerd" },
];

const PAY_OPTIONS = [
  { v: "pending", label: "In behandeling" },
  { v: "paid", label: "Betaald" },
  { v: "failed", label: "Mislukt" },
  { v: "cancelled", label: "Geannuleerd" },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("bookings");
  const [bookings, setBookings] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [b, c] = await Promise.all([api.get("/admin/bookings"), api.get("/admin/contacts")]);
      setBookings(b.data);
      setContacts(c.data);
    } catch (e) {
      if (e.response?.status === 401 || e.response?.status === 403) {
        toast.error("Sessie verlopen. Log opnieuw in.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, field, value) => {
    try {
      const res = await api.patch(`/admin/bookings/${id}`, { [field]: value });
      setBookings((bs) => bs.map((b) => (b.id === id ? res.data : b)));
      toast.success("Bijgewerkt");
    } catch {
      toast.error("Update mislukt");
    }
  };

  const totalRevenue = bookings.filter((b) => b.payment_status === "paid").reduce((s, b) => s + b.price, 0);

  return (
    <div className="py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            {user?.picture && <img src={user.picture} alt="" className="w-12 h-12 rounded-full border border-[#D4AF37]/50" />}
            <div>
              <p className="eyebrow mb-1">Admin Dashboard</p>
              <h1 className="font-serif text-3xl font-light">{user?.name || "KeldersVisuals"}</h1>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={load} className="btn-outline-gold" data-testid="admin-refresh"><RefreshCcw size={14} /> Vernieuwen</button>
            <button onClick={logout} className="btn-outline-gold" data-testid="admin-logout"><LogOut size={14} /> Uitloggen</button>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <Stat label="Totaal boekingen" value={bookings.length} />
          <Stat label="Nieuwe aanvragen" value={bookings.filter((b) => b.booking_status === "new").length} />
          <Stat label="Omzet (betaald)" value={`€${totalRevenue.toFixed(0)}`} />
        </div>

        <div className="flex gap-2 mb-6 border-b border-amber-500/10 overflow-x-auto">
          {[["bookings", `Boekingen (${bookings.length})`, null], ["contacts", `Contact berichten (${contacts.length})`, null], ["reviews", "Reviews", <Star key="s" size={12} />], ["ai", "AI Tools", <Sparkles key="a" size={12} />]].map(([k, l, icon]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              data-testid={`admin-tab-${k}`}
              className={`px-5 py-3 text-xs tracking-[0.2em] uppercase transition-colors border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap ${
                tab === k ? "border-[#D4AF37] text-[#D4AF37]" : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >{icon} {l}</button>
          ))}
        </div>

        {loading && <p className="text-zinc-500 py-10 text-center">Laden…</p>}

        {tab === "bookings" && !loading && (
          <div className="space-y-3" data-testid="admin-bookings-list">
            {bookings.length === 0 && <p className="text-zinc-500 py-10 text-center">Nog geen boekingen.</p>}
            {bookings.map((b) => (
              <div key={b.id} className="card-luxe p-5 lg:p-6">
                <div className="grid lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2">
                    <p className="text-[10px] font-mono text-zinc-500 mb-1">#{b.id.slice(0, 8).toUpperCase()}</p>
                    <p className="font-serif text-xl mb-1">{b.name}</p>
                    <p className="text-sm text-zinc-400">{b.service}</p>
                    <p className="text-xs text-zinc-500 mt-2">{b.date} — {b.time} · {b.location}</p>
                    {b.company && <p className="text-xs text-zinc-500">{b.company}</p>}
                    {b.message && <p className="text-xs text-zinc-500 mt-2 italic">"{b.message}"</p>}
                  </div>
                  <div className="text-sm space-y-2">
                    <p className="text-zinc-500 text-xs">Contact</p>
                    <a href={`mailto:${b.email}`} className="flex items-center gap-2 text-zinc-200 hover:text-[#D4AF37]"><Mail size={12} /> {b.email}</a>
                    <a href={`https://wa.me/${b.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-zinc-200 hover:text-[#D4AF37]"><MessageCircle size={12} /> {b.phone}</a>
                    <p className="text-[#D4AF37] font-mono text-sm pt-2">€{b.price.toFixed(2)}</p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">Status</label>
                      <select value={b.booking_status} onChange={(e) => updateStatus(b.id, "booking_status", e.target.value)} className="input-luxe text-xs py-2" data-testid={`booking-status-${b.id}`}>
                        {STATUS_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-zinc-500 block mb-1">Betaling</label>
                      <select value={b.payment_status} onChange={(e) => updateStatus(b.id, "payment_status", e.target.value)} className="input-luxe text-xs py-2" data-testid={`payment-status-${b.id}`}>
                        {PAY_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "contacts" && !loading && (
          <div className="space-y-3" data-testid="admin-contacts-list">
            {contacts.length === 0 && <p className="text-zinc-500 py-10 text-center">Nog geen berichten.</p>}
            {contacts.map((c) => (
              <div key={c.id} className="card-luxe p-6">
                <div className="flex flex-wrap justify-between gap-4 mb-2">
                  <p className="font-serif text-lg">{c.name} {c.company && <span className="text-zinc-500 text-sm">· {c.company}</span>}</p>
                  <div className="text-xs text-zinc-500">{new Date(c.created_at).toLocaleString("nl-NL")}</div>
                </div>
                <div className="text-xs text-zinc-500 mb-3 flex gap-4 flex-wrap">
                  <a href={`mailto:${c.email}`} className="hover:text-[#D4AF37]">{c.email}</a>
                  {c.phone && <a href={`tel:${c.phone}`} className="hover:text-[#D4AF37]">{c.phone}</a>}
                  {c.shoot_type && <span>· {c.shoot_type}</span>}
                  {c.preferred_date && <span>· {c.preferred_date}</span>}
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{c.message}</p>
              </div>
            ))}
          </div>
        )}
        {tab === "ai" && <AITools />}
        {tab === "reviews" && <ReviewsAdmin />}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card-luxe p-6">
      <p className="eyebrow mb-3">{label}</p>
      <p className="font-serif text-4xl text-[#D4AF37]">{value}</p>
    </div>
  );
}
