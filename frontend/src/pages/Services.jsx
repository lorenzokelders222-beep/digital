import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { SERVICES } from "../lib/services";

export default function Services() {
  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
        <div className="max-w-3xl mb-16">
          <p className="eyebrow mb-4">Onze Diensten</p>
          <h1 className="font-serif text-5xl sm:text-6xl font-light leading-tight mb-6">
            Elk beeld,<br /><em className="text-[#D4AF37]">zijn eigen taal.</em>
          </h1>
          <div className="gold-divider max-w-[80px] mb-6" />
          <p className="text-zinc-400 leading-relaxed">
            Van cinematografische bedrijfsfilms tot luchtbeelden vanuit een FPV-drone — kies de dienst die past bij jouw verhaal, of laat ons een maatwerk-concept bouwen.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((s) => (
            <div key={s.slug} className="card-luxe overflow-hidden" data-testid={`service-card-${s.slug}`}>
              <div className="aspect-[4/3] overflow-hidden">
                <img src={s.image} alt={s.title} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
              </div>
              <div className="p-6 lg:p-8">
                <p className="eyebrow mb-3">{s.slug}</p>
                <h3 className="font-serif text-2xl mb-3">{s.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed mb-6 min-h-[70px]">{s.short}</p>
                <div className="flex items-center justify-between pt-4 border-t border-amber-500/10">
                  <span className="text-[#D4AF37] font-mono text-sm">{s.price > 0 ? `vanaf €${s.price}` : "op aanvraag"}</span>
                  <Link to={`/boeken?dienst=${s.slug}`} className="text-xs tracking-[0.2em] uppercase text-zinc-300 hover:text-[#D4AF37] flex items-center gap-1" data-testid={`service-book-${s.slug}`}>
                    Meer informatie <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-24 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl font-light mb-6">Niet gevonden wat je zoekt?</h2>
          <p className="text-zinc-400 max-w-xl mx-auto mb-8">Wij bouwen graag een concept op maat. Neem contact op en we bespreken de mogelijkheden.</p>
          <Link to="/contact" className="btn-gold" data-testid="services-contact-cta">Neem contact op <ArrowUpRight size={16} /></Link>
        </div>
      </div>
    </div>
  );
}
