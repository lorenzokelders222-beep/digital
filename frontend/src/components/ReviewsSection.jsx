import { useEffect, useState } from "react";
import { Star, Quote } from "lucide-react";
import api from "../lib/api";

export default function ReviewsSection() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/reviews/public")
      .then((r) => setReviews(r.data))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || reviews.length === 0) return null;

  return (
    <section className="py-24 lg:py-32 relative" data-testid="home-reviews-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
        <div className="text-center mb-16">
          <p className="eyebrow mb-4">Reviews</p>
          <h2 className="font-serif text-4xl sm:text-5xl font-light">
            Wat klanten <em className="text-[#D4AF37]">zeggen.</em>
          </h2>
          <div className="gold-divider max-w-[80px] mx-auto mt-6" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.slice(0, 6).map((r) => (
            <div key={r.id} className="card-luxe p-8 relative" data-testid={`review-card-${r.id}`}>
              <Quote className="absolute top-6 right-6 text-[#D4AF37]/15" size={40} strokeWidth={1} />
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    size={14}
                    strokeWidth={1.2}
                    className={n <= r.rating ? "fill-[#D4AF37] text-[#D4AF37]" : "text-zinc-700"}
                  />
                ))}
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed mb-6 font-serif italic">"{r.text}"</p>
              <div className="pt-4 border-t border-amber-500/10">
                <p className="text-zinc-100 text-sm font-medium">{r.name}</p>
                <p className="text-xs text-zinc-500 mt-1">{r.service}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
