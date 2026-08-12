import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Star, Check, X, Trash2 } from "lucide-react";
import api from "../lib/api";

export default function ReviewsAdmin() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/reviews");
      setReviews(r.data);
    } catch { toast.error("Kon reviews niet laden"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const moderate = async (id, approved) => {
    try {
      const r = await api.patch(`/admin/reviews/${id}`, { approved });
      setReviews((rs) => rs.map((x) => (x.id === id ? r.data : x)));
      toast.success(approved ? "Goedgekeurd — nu zichtbaar op homepage" : "Verborgen");
    } catch { toast.error("Update mislukt"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Review verwijderen?")) return;
    try {
      await api.delete(`/admin/reviews/${id}`);
      setReviews((rs) => rs.filter((x) => x.id !== id));
      toast.success("Verwijderd");
    } catch { toast.error("Verwijderen mislukt"); }
  };

  const filtered = reviews.filter((r) => {
    if (filter === "pending") return !r.approved;
    if (filter === "approved") return r.approved;
    return true;
  });

  return (
    <div className="space-y-4" data-testid="admin-reviews-list">
      <div className="flex gap-2">
        {[["all", `Alle (${reviews.length})`], ["pending", `Wachtrij (${reviews.filter((r) => !r.approved).length})`], ["approved", `Gepubliceerd (${reviews.filter((r) => r.approved).length})`]].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            data-testid={`reviews-filter-${k}`}
            className={`px-4 py-2 text-[10px] tracking-widest uppercase border transition-all ${filter === k ? "border-[#D4AF37] text-[#D4AF37]" : "border-amber-500/20 text-zinc-400 hover:text-zinc-200"}`}
          >{l}</button>
        ))}
      </div>

      {loading && <p className="text-zinc-500 py-10 text-center">Laden…</p>}
      {!loading && filtered.length === 0 && (
        <div className="card-luxe p-10 text-center">
          <p className="text-zinc-500 text-sm">Nog geen reviews in deze filter.</p>
          <p className="text-zinc-600 text-xs mt-2">Zet een boeking op "Afgerond" en de klant krijgt automatisch een review-verzoek per e-mail.</p>
        </div>
      )}

      {filtered.map((r) => (
        <div key={r.id} className="card-luxe p-6" data-testid={`review-row-${r.id}`}>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={12} className={n <= r.rating ? "fill-[#D4AF37] text-[#D4AF37]" : "text-zinc-700"} strokeWidth={1.2} />
                ))}
                <span className="text-[10px] text-zinc-500 ml-2">{new Date(r.created_at).toLocaleDateString("nl-NL")}</span>
              </div>
              <p className="font-serif text-lg">{r.name}</p>
              <p className="text-xs text-zinc-500">{r.service}</p>
            </div>
            <div className="flex gap-2">
              {r.approved ? (
                <span className="text-[10px] px-3 py-1 border border-emerald-500/40 text-emerald-400 uppercase tracking-widest">Live</span>
              ) : (
                <span className="text-[10px] px-3 py-1 border border-amber-500/40 text-amber-400 uppercase tracking-widest">Wachtrij</span>
              )}
            </div>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed italic mb-4">"{r.text}"</p>
          <div className="flex gap-2 pt-3 border-t border-amber-500/10">
            {r.approved ? (
              <button onClick={() => moderate(r.id, false)} className="text-xs text-zinc-400 hover:text-amber-400 flex items-center gap-1" data-testid={`review-hide-${r.id}`}>
                <X size={12} /> Verberg
              </button>
            ) : (
              <button onClick={() => moderate(r.id, true)} className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1" data-testid={`review-approve-${r.id}`}>
                <Check size={12} /> Publiceer
              </button>
            )}
            <button onClick={() => remove(r.id)} className="text-xs text-zinc-500 hover:text-red-400 flex items-center gap-1 ml-auto" data-testid={`review-delete-${r.id}`}>
              <Trash2 size={12} /> Verwijder
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
