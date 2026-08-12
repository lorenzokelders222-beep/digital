import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Check, ChevronRight, ChevronLeft, Lock } from "lucide-react";
import api from "../lib/api";
import { SERVICES } from "../lib/services";

const STEPS = ["Dienst", "Datum & Tijd", "Gegevens", "Overzicht", "Betaling"];

const TIMES = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30", "18:00"];

const initial = {
  service_slug: "",
  date: "",
  time: "",
  name: "",
  email: "",
  phone: "",
  company: "",
  location: "",
  message: "",
};

export default function Booking() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const prefill = params.get("dienst");
    if (prefill && SERVICES.find((s) => s.slug === prefill)) {
      setData((d) => ({ ...d, service_slug: prefill }));
    }
  }, [params]);

  const service = useMemo(() => SERVICES.find((s) => s.slug === data.service_slug), [data.service_slug]);
  const price = service?.price || 0;
  const deposit = price > 0 ? Math.round(price * 0.25) : 0;

  const change = (k) => (e) => setData((d) => ({ ...d, [k]: e.target.value }));

  const validate = () => {
    if (step === 0 && !data.service_slug) return "Kies eerst een dienst.";
    if (step === 1 && (!data.date || !data.time)) return "Kies datum en tijd.";
    if (step === 2) {
      if (!data.name || !data.email || !data.phone || !data.location) return "Vul verplichte velden in.";
    }
    return null;
  };

  const next = () => {
    const err = validate();
    if (err) return toast.error(err);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    setLoading(true);
    try {
      const res = await api.post("/bookings", {
        service: service.title,
        date: data.date,
        time: data.time,
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        location: data.location,
        message: data.message,
        price,
        deposit,
      });
      toast.success("Boeking ontvangen — bevestiging in je inbox.");
      nav(`/boeking-bevestiging/${res.data.id}`);
    } catch {
      toast.error("Kon boeking niet verzenden. Probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-8">
        <div className="mb-12 text-center">
          <p className="eyebrow mb-4">Boeken</p>
          <h1 className="font-serif text-4xl sm:text-5xl font-light">Plan je <em className="text-[#D4AF37]">shoot.</em></h1>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-12 gap-2" data-testid="booking-progress">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-2">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-mono border transition-all ${i <= step ? "bg-[#D4AF37] text-black border-[#D4AF37]" : "border-amber-500/25 text-zinc-500"}`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-[10px] tracking-[0.15em] uppercase text-center ${i === step ? "text-[#D4AF37]" : "text-zinc-500"}`}>{label}</span>
            </div>
          ))}
        </div>

        <div className="card-luxe p-6 sm:p-10 min-h-[380px]">
          {/* Step 0 */}
          {step === 0 && (
            <div data-testid="booking-step-service">
              <h2 className="font-serif text-2xl mb-6">Kies een dienst</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {SERVICES.map((s) => (
                  <button
                    key={s.slug}
                    onClick={() => setData((d) => ({ ...d, service_slug: s.slug }))}
                    data-testid={`booking-service-${s.slug}`}
                    className={`text-left p-5 border transition-all ${data.service_slug === s.slug ? "border-[#D4AF37] bg-[#D4AF37]/5" : "border-amber-500/15 hover:border-[#D4AF37]/50"}`}
                  >
                    <p className="font-serif text-lg mb-1">{s.title}</p>
                    <p className="text-xs text-zinc-500 line-clamp-2 mb-2">{s.short}</p>
                    <p className="text-xs text-[#D4AF37] font-mono">{s.price > 0 ? `vanaf €${s.price}` : "op aanvraag"}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div data-testid="booking-step-datetime">
              <h2 className="font-serif text-2xl mb-6">Datum & tijd</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="eyebrow block mb-3">Gewenste datum</label>
                  <input
                    data-testid="booking-date"
                    type="date"
                    className="input-luxe"
                    min={new Date().toISOString().slice(0, 10)}
                    value={data.date}
                    onChange={change("date")}
                  />
                </div>
                <div>
                  <label className="eyebrow block mb-3">Tijdslot</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TIMES.map((t) => (
                      <button
                        key={t}
                        onClick={() => setData((d) => ({ ...d, time: t }))}
                        data-testid={`booking-time-${t}`}
                        className={`py-3 text-sm border transition ${data.time === t ? "bg-[#D4AF37] text-black border-[#D4AF37]" : "border-amber-500/15 text-zinc-300 hover:border-[#D4AF37]/50"}`}
                      >{t}</button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-6">Definitieve tijden worden na aanvraag bevestigd (WhatsApp/e-mail).</p>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div data-testid="booking-step-details">
              <h2 className="font-serif text-2xl mb-6">Jouw gegevens</h2>
              <div className="grid sm:grid-cols-2 gap-5">
                <div><label className="eyebrow block mb-2">Naam *</label><input data-testid="booking-name" className="input-luxe" value={data.name} onChange={change("name")} /></div>
                <div><label className="eyebrow block mb-2">E-mail *</label><input data-testid="booking-email" type="email" className="input-luxe" value={data.email} onChange={change("email")} /></div>
                <div><label className="eyebrow block mb-2">Telefoon *</label><input data-testid="booking-phone" className="input-luxe" value={data.phone} onChange={change("phone")} /></div>
                <div><label className="eyebrow block mb-2">Bedrijf</label><input data-testid="booking-company" className="input-luxe" value={data.company} onChange={change("company")} /></div>
                <div className="sm:col-span-2"><label className="eyebrow block mb-2">Locatie *</label><input data-testid="booking-location" className="input-luxe" placeholder="Adres of stad" value={data.location} onChange={change("location")} /></div>
                <div className="sm:col-span-2"><label className="eyebrow block mb-2">Bericht / opmerkingen</label><textarea data-testid="booking-message" rows={4} className="input-luxe resize-none" value={data.message} onChange={change("message")} /></div>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div data-testid="booking-step-review">
              <h2 className="font-serif text-2xl mb-6">Overzicht</h2>
              <div className="space-y-3 text-sm">
                <Row k="Dienst" v={service?.title} />
                <Row k="Datum" v={data.date} />
                <Row k="Tijd" v={data.time} />
                <Row k="Locatie" v={data.location} />
                <Row k="Naam" v={data.name} />
                <Row k="E-mail" v={data.email} />
                <Row k="Telefoon" v={data.phone} />
                {data.company && <Row k="Bedrijf" v={data.company} />}
                <div className="gold-divider my-4" />
                <Row k="Prijs" v={price > 0 ? `€${price.toFixed(2)}` : "Op aanvraag"} />
                {deposit > 0 && <Row k="Aanbetaling (25%)" v={`€${deposit.toFixed(2)}`} />}
                <div className="pt-3 mt-3 border-t border-amber-500/20 flex justify-between">
                  <span className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.2em]">Totaal</span>
                  <span className="font-serif text-2xl text-[#D4AF37]">{price > 0 ? `€${price.toFixed(2)}` : "—"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div data-testid="booking-step-payment">
              <h2 className="font-serif text-2xl mb-6">Betaling</h2>
              <div className="p-6 border border-amber-500/20 bg-[#D4AF37]/5 mb-6">
                <p className="text-sm text-zinc-300 mb-2">
                  Bevestig je boeking hieronder. Na bevestiging ontvang je van ons een aparte, veilige betaallink via <span className="text-[#D4AF37]">SumUp</span> voor de {deposit > 0 ? "aanbetaling" : "volledige betaling"}.
                </p>
                <p className="text-xs text-zinc-500">Geen betaalgegevens worden op deze pagina opgeslagen.</p>
              </div>
              <div className="space-y-3 text-sm mb-6">
                <Row k="Dienst" v={service?.title} />
                <Row k="Datum & tijd" v={`${data.date} — ${data.time}`} />
                {deposit > 0 && <Row k="Aanbetaling" v={`€${deposit.toFixed(2)}`} />}
                <Row k="Totaal" v={price > 0 ? `€${price.toFixed(2)}` : "Op aanvraag"} highlight />
              </div>
              <button
                onClick={submit}
                disabled={loading}
                data-testid="booking-confirm-submit"
                className="btn-gold w-full justify-center"
              >
                <Lock size={14} /> {loading ? "Bezig…" : "Bevestig boeking · Betaal veilig"}
              </button>
            </div>
          )}
        </div>

        {/* Nav buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={prev}
            disabled={step === 0}
            data-testid="booking-prev-button"
            className="btn-outline-gold disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} /> Terug
          </button>
          {step < STEPS.length - 1 && (
            <button onClick={next} data-testid="booking-next-button" className="btn-gold">
              Verder <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, highlight }) {
  return (
    <div className="flex justify-between py-2 border-b border-amber-500/10 last:border-0">
      <span className="text-zinc-500">{k}</span>
      <span className={highlight ? "text-[#D4AF37] font-mono" : "text-zinc-100"}>{v || "—"}</span>
    </div>
  );
}
