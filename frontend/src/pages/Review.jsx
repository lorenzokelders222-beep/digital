import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Star, ArrowUpRight, Check } from "lucide-react";
import api from "../lib/api";

export default function Review() {
  const { bookingId } = useParams();
  const [ctx, setCtx] = useState(null);
  const [err, setErr] = useState("");
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get(`/reviews/booking/${bookingId}`)
      .then((r) => {
        setCtx(r.data);
        setName(r.data.name || "");
        if (r.data.has_review) setErr("Er is al een review voor deze boeking. Bedankt!");
      })
      .catch(() => setErr("Boeking niet gevonden."));
  }, [bookingId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || text.trim().length < 10) return toast.error("Schrijf minimaal 10 tekens.");
    setBusy(true);
    try {
      await api.post("/reviews", { booking_id: bookingId, rating, name, text });
      setSubmitted(true);
    } catch (e) {
      const msg = e.response?.data?.detail || "Kon review niet versturen.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  if (err) {
    return (
      <div className="py-24 max-w-xl mx-auto px-4 text-center">
        <p className="text-zinc-400 mb-6">{err}</p>
        <Link to="/" className="btn-outline-gold">Terug naar home</Link>
      </div>
    );
  }

  if (!ctx) return <div className="py-32 text-center text-zinc-500">Laden…</div>;

  if (submitted) {
    return (
      <div className="py-24 max-w-xl mx-auto px-4 text-center" data-testid="review-thanks">
        <div className="w-14 h-14 rounded-full border border-[#D4AF37] flex items-center justify-center mx-auto mb-6">
          <Check className="text-[#D4AF37]" size={26} />
        </div>
        <p className="eyebrow mb-4">Verstuurd</p>
        <h1 className="font-serif text-4xl font-light mb-4">Bedankt voor je <em className="text-[#D4AF37]">review!</em></h1>
        <p className="text-zinc-400 leading-relaxed mb-8">
          We waarderen het enorm dat je de moeite hebt genomen. Na goedkeuring verschijnt je bericht op onze homepage.
        </p>
        <Link to="/" className="btn-gold">Terug naar home <ArrowUpRight size={16} /></Link>
      </div>
    );
  }

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-2xl mx-auto px-4 sm:px-8">
        <div className="text-center mb-10">
          <p className="eyebrow mb-4">Jouw ervaring</p>
          <h1 className="font-serif text-4xl sm:text-5xl font-light mb-4">
            Hoe was jouw <em className="text-[#D4AF37]">shoot?</em>
          </h1>
          <p className="text-zinc-400 text-sm">
            {ctx.service} · {ctx.date}
          </p>
        </div>

        <form onSubmit={submit} className="card-luxe p-8 lg:p-10 space-y-6" data-testid="review-form">
          {/* Star selector */}
          <div className="text-center">
            <p className="eyebrow mb-4">Beoordeling</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  data-testid={`review-star-${n}`}
                  className="p-1 transition-transform hover:scale-110"
                  aria-label={`${n} sterren`}
                >
                  <Star
                    size={36}
                    strokeWidth={1.2}
                    className={n <= (hover || rating) ? "fill-[#D4AF37] text-[#D4AF37]" : "text-zinc-600"}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-3">{rating} van 5 sterren</p>
          </div>

          <div>
            <label className="eyebrow block mb-2">Naam</label>
            <input
              className="input-luxe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="review-name"
              required
            />
          </div>

          <div>
            <label className="eyebrow block mb-2">Jouw ervaring</label>
            <textarea
              rows={6}
              className="input-luxe resize-none"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Wat vond je van de samenwerking, het resultaat en de sfeer tijdens de shoot?"
              data-testid="review-text"
              required
              minLength={10}
            />
            <p className="text-[10px] text-zinc-500 mt-1">Minimaal 10 tekens.</p>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="btn-gold w-full justify-center"
            data-testid="review-submit"
          >
            {busy ? "Versturen…" : "Verstuur review"} <ArrowUpRight size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
