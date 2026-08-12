import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Calendar, MessageCircle, LogOut, MapPin } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { WHATSAPP_URL } from "../lib/services";

const STATUS_LABEL = {
  new: "Nieuw",
  confirmed: "Bevestigd",
  completed: "Afgerond",
  cancelled: "Geannuleerd",
};
const PAY_LABEL = { pending: "In behandeling", paid: "Betaald", failed: "Mislukt", cancelled: "Geannuleerd" };
const PAY_COLOR = { pending: "text-amber-400", paid: "text-emerald-400", failed: "text-red-400", cancelled: "text-zinc-500" };

export default function MyAccount() {
  const { user, loading, logout } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.get("/me/bookings").then((r) => setBookings(r.data)).finally(() => setBusy(false));
  }, [user]);

  if (loading) return <div className="py-32 text-center text-zinc-500">Laden…</div>;
  if (!user) return <Navigate to="/login" state={{ from: "/mijn-account" }} replace />;

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            {user.picture ? (
              <img src={user.picture} alt={user.name} className="w-16 h-16 rounded-full border border-[#D4AF37]/50" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] font-serif text-2xl">
                {(user.name || user.email)[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="eyebrow mb-1">Mijn account</p>
              <h1 className="font-serif text-3xl font-light" data-testid="account-name">{user.name || user.email}</h1>
              <p className="text-xs text-zinc-500 mt-1">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-3">
            {user.is_admin && (
              <Link to="/admin" className="btn-outline-gold" data-testid="account-admin-cta">Admin dashboard</Link>
            )}
            <button onClick={logout} className="btn-outline-gold" data-testid="account-logout">
              <LogOut size={14} /> Uitloggen
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap justify-between items-end gap-4">
          <h2 className="font-serif text-2xl">Mijn boekingen</h2>
          <Link to="/boeken" className="btn-gold" data-testid="account-new-booking">
            <Calendar size={14} /> Nieuwe boeking
          </Link>
        </div>

        {busy && <p className="text-zinc-500 py-10 text-center">Laden…</p>}

        {!busy && bookings.length === 0 && (
          <div className="card-luxe p-12 text-center">
            <Calendar size={32} className="text-[#D4AF37] mx-auto mb-4" strokeWidth={1.2} />
            <h3 className="font-serif text-2xl mb-3">Nog geen boekingen</h3>
            <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
              Zodra je een shoot boekt, verschijnt deze automatisch in jouw overzicht met alle details en status.
            </p>
            <Link to="/boeken" className="btn-gold">Plan je eerste shoot</Link>
          </div>
        )}

        {!busy && bookings.length > 0 && (
          <div className="space-y-3" data-testid="account-bookings-list">
            {bookings.map((b) => (
              <div key={b.id} className="card-luxe p-6" data-testid={`account-booking-${b.id}`}>
                <div className="flex flex-wrap justify-between gap-4 mb-4">
                  <div>
                    <p className="text-[10px] font-mono text-zinc-500 mb-1">#{b.id.slice(0, 8).toUpperCase()}</p>
                    <h3 className="font-serif text-xl">{b.service}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] px-3 py-1 border border-amber-500/30 text-[#D4AF37] uppercase tracking-widest">
                      {STATUS_LABEL[b.booking_status] || b.booking_status}
                    </span>
                    <span className={`text-[10px] px-3 py-1 border border-zinc-700 uppercase tracking-widest ${PAY_COLOR[b.payment_status]}`}>
                      {PAY_LABEL[b.payment_status] || b.payment_status}
                    </span>
                  </div>
                </div>
                <div className="grid sm:grid-cols-4 gap-4 text-sm">
                  <Cell k="Datum" v={b.date} />
                  <Cell k="Tijd" v={b.time} />
                  <Cell k="Locatie" v={b.location} icon={<MapPin size={12} />} />
                  <Cell k="Bedrag" v={b.price > 0 ? `€${b.price.toFixed(2)}` : "Op aanvraag"} gold />
                </div>
                {b.message && <p className="text-xs text-zinc-500 italic mt-4 pt-4 border-t border-amber-500/10">"{b.message}"</p>}
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-amber-500/10">
                  <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="text-xs tracking-widest uppercase text-zinc-300 hover:text-[#D4AF37] flex items-center gap-1">
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                  <Link to={`/boeking-bevestiging/${b.id}`} className="text-xs tracking-widest uppercase text-zinc-300 hover:text-[#D4AF37] ml-auto">
                    Bekijk details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Cell({ k, v, gold, icon }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{k}</p>
      <p className={`flex items-center gap-1 ${gold ? "text-[#D4AF37] font-mono" : "text-zinc-100"}`}>
        {icon} {v || "—"}
      </p>
    </div>
  );
}
