import { useState } from "react";
import { X } from "lucide-react";
import { PORTFOLIO, CATEGORIES } from "../lib/services";

export default function Portfolio() {
  const [cat, setCat] = useState("Alles");
  const [selected, setSelected] = useState(null);
  const items = cat === "Alles" ? PORTFOLIO : PORTFOLIO.filter((p) => p.category === cat);

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
        <div className="mb-12">
          <p className="eyebrow mb-4">Portfolio</p>
          <h1 className="font-serif text-5xl sm:text-6xl font-light leading-tight mb-6">
            Ons <em className="text-[#D4AF37]">werk.</em>
          </h1>
          <div className="gold-divider max-w-[80px]" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-12">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              data-testid={`portfolio-filter-${c.toLowerCase().replace(/\s+/g, "-")}`}
              className={`px-5 py-2 text-xs tracking-[0.2em] uppercase border transition-all ${
                cat === c
                  ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                  : "border-amber-500/20 text-zinc-300 hover:border-[#D4AF37]/60 hover:text-[#D4AF37]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Masonry-ish grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((p, i) => (
            <button
              key={`${cat}-${i}`}
              onClick={() => setSelected(p)}
              data-testid={`portfolio-item-${i}`}
              className={`portfolio-item block ${i % 7 === 0 ? "row-span-2 aspect-[3/4] md:aspect-[3/5]" : "aspect-[4/5]"}`}
            >
              <img src={p.url} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
              <div className="portfolio-overlay">
                <div>
                  <p className="eyebrow text-[10px] mb-1">{p.category}</p>
                  <p className="font-serif text-lg">{p.title}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {items.length === 0 && (
          <p className="text-center text-zinc-500 py-16">Binnenkort meer werk in deze categorie.</p>
        )}
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          data-testid="portfolio-lightbox"
          className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-10"
          onClick={() => setSelected(null)}
        >
          <button
            className="absolute top-6 right-6 text-white/70 hover:text-[#D4AF37] transition-colors"
            onClick={() => setSelected(null)}
            data-testid="lightbox-close"
            aria-label="Sluiten"
          >
            <X size={28} />
          </button>
          <div className="max-w-6xl w-full max-h-[85vh] flex flex-col items-center gap-4">
            <img src={selected.url} alt={selected.title} className="max-h-[80vh] w-auto object-contain" />
            <div className="text-center">
              <p className="eyebrow mb-2">{selected.category}</p>
              <p className="font-serif text-2xl text-white">{selected.title}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
