import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export default function About() {
  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1">
            <p className="eyebrow mb-4">Over KeldersVisuals</p>
            <h1 className="font-serif text-5xl sm:text-6xl font-light leading-[1.05] mb-8">
              Beeld dat<br /><em className="text-[#D4AF37]">bij jou past.</em>
            </h1>
            <div className="gold-divider max-w-[80px] mb-8" />
            <div className="space-y-5 text-zinc-400 leading-relaxed">
              <p>
                KeldersVisuals ontstond uit een simpele overtuiging: een goed beeld voelt anders dan een gewoon beeld. Het blijft hangen. Het vertelt iets. Het maakt indruk zonder er om te vragen.
              </p>
              <p>
                Vanuit die overtuiging leggen wij momenten vast voor mensen, merken en bedrijven die verder willen kijken dan het standaard. Of het nu een portret is, een autoshoot bij eerste licht, een cinematische bedrijfsfilm of dynamische FPV-beelden — we werken met dezelfde toewijding aan detail.
              </p>
              <p>
                We geloven in persoonlijk contact voordat we op record drukken. In begrijpen wat een klant écht wil laten zien. En in de rust om het beeld te vinden dat er nog niet was.
              </p>
              <p className="text-[#D4AF37]/90 font-serif italic text-xl">
                "Beelden zijn geen luxe, maar de eerste indruk die je maakt."
              </p>
            </div>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/boeken" className="btn-gold" data-testid="about-booking-cta">Werk samen <ArrowUpRight size={16} /></Link>
              <Link to="/portfolio" className="btn-outline-gold" data-testid="about-portfolio-cta">Bekijk werk</Link>
            </div>
          </div>

          <div className="lg:col-span-6 order-1 lg:order-2">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1470338229081-eb5980be28c9?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400"
                alt="KeldersVisuals studio"
                className="w-full aspect-[4/5] object-cover"
              />
              <div className="absolute -bottom-6 -left-6 hidden md:block w-40 h-40 border-2 border-[#D4AF37]/60" />
            </div>
          </div>
        </div>

        {/* Values row */}
        <div className="grid md:grid-cols-3 gap-6 mt-24">
          {[
            { k: "Sinds 2021", v: "Actief in fotografie & videografie" },
            { k: "100+", v: "Persoonlijke & zakelijke shoots" },
            { k: "5 dagen", v: "Gemiddelde oplevertijd" },
          ].map((s, i) => (
            <div key={i} className="card-luxe p-8 text-center">
              <p className="font-serif text-4xl text-[#D4AF37] mb-2">{s.k}</p>
              <p className="text-sm text-zinc-400 tracking-wide">{s.v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
