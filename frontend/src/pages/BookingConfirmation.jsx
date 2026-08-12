import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, MessageCircle, Home as HomeIcon } from "lucide-react";
import api from "../lib/api";
import { WHATSAPP_URL } from "../lib/services";

export default function BookingConfirmation() {
  const { id } = useParams();
  const [b, setB] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    api.get(`/bookings/${id}`).then((r) => setB(r.data)).catch(() => setErr(true));
  }, [id]);

  if (err) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-serif text-3xl mb-4">Boeking niet gevonden</p>
          <Link to="/" className="btn-outline-gold">Terug naar home</Link>
        </div>
      </div>
    );
  }

  if (!b) return <div className="py-32 text-center text-zinc-500">Laden…</div>;

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-8">
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-full border border-[#D4AF37] flex items-center justify-center mx-auto mb-6">
            <Check className="text-[#D4AF37]" size={28} />
          </div>
          <p className="eyebrow mb-4">Boekingsbevestiging</p>
          <h1 className="font-serif text-4xl sm:text-5xl font-light leading-tight mb-4">
            Bedankt voor je boeking bij<br /><em className="text-[#D4AF37]">KeldersVisuals!</em>
          </h1>
          <p className="text-zinc-400 max-w-lg mx-auto">Je ontvangt binnen enkele minuten een bevestigingsmail met alle details.</p>
        </div>

        <div data-testid="booking-summary-card" className="card-luxe p-8 lg:p-10 mb-8">
          <p className="eyebrow mb-6">Overzicht</p>
          <div className="space-y-3 text-sm">
            <Row k="Boekingsnummer" v={b.id.slice(0, 8).toUpperCase()} mono />
            <Row k="Dienst" v={b.service} />
            <Row k="Datum" v={b.date} />
            <Row k="Tijd" v={b.time} />
            <Row k="Locatie" v={b.location} />
            <Row k="Bedrag" v={b.price > 0 ? `€${b.price.toFixed(2)}` : "Op aanvraag"} highlight />
            <Row k="Betalingsstatus" v={statusLabel(b.payment_status)} status={b.payment_status} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="btn-gold justify-center" data-testid="confirm-whatsapp">
            <MessageCircle size={14} /> WhatsApp opnemen
          </a>
          <Link to="/" className="btn-outline-gold justify-center" data-testid="confirm-home">
            <HomeIcon size={14} /> Terug naar home
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, highlight, mono, status }) {
  const colorMap = {
    pending: "text-amber-400",
    paid: "text-emerald-400",
    failed: "text-red-400",
    cancelled: "text-zinc-500",
  };
  const cls = status ? colorMap[status] || "text-zinc-100" : highlight ? "text-[#D4AF37] font-mono" : mono ? "text-zinc-100 font-mono" : "text-zinc-100";
  return (
    <div className="flex justify-between py-3 border-b border-amber-500/10 last:border-0">
      <span className="text-zinc-500">{k}</span>
      <span className={cls}>{v || "—"}</span>
    </div>
  );
}

function statusLabel(s) {
  return { pending: "In behandeling", paid: "Betaald", failed: "Mislukt", cancelled: "Geannuleerd" }[s] || s;
}
