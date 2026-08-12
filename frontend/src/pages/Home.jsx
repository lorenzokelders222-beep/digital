import { Link } from "react-router-dom";
import { ArrowUpRight, Camera, Video, Plane, Car, User, Building2, Sparkles, Heart, ChevronRight, MessageCircle } from "lucide-react";
import { SERVICES, PORTFOLIO, WHATSAPP_URL } from "../lib/services";

const HERO_BG = "https://images.unsplash.com/photo-1567808291548-fc3ee04dbcf0?crop=entropy&cs=srgb&fm=jpg&q=85&w=2400";

const PILLARS = [
  { icon: Heart, title: "Persoonlijke aanpak", text: "Persoonlijk contact en aandacht voor jouw wensen." },
  { icon: Camera, title: "Professionele beelden", text: "Hoogwaardige foto's en video's die professioneel worden afgewerkt." },
  { icon: Sparkles, title: "Creatieve visie", text: "We zoeken naar beelden die verder gaan dan standaard." },
  { icon: ChevronRight, title: "Kwaliteit voorop", text: "Van voorbereiding tot oplevering staat kwaliteit centraal." },
];

const STEPS = [
  { n: "01", t: "Kennismaken", d: "We bespreken jouw wensen, ideeën en verwachtingen." },
  { n: "02", t: "Voorbereiden", d: "We bepalen samen wat nodig is voor de shoot." },
  { n: "03", t: "Shoot", d: "Wij zorgen voor professionele beelden met oog voor detail." },
  { n: "04", t: "Oplevering", d: "Je ontvangt de beelden professioneel nabewerkt en klaar voor gebruik." },
];

export default function Home() {
  return (
    <div>
      {/* HERO */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden -mt-20 pt-20">
        <img src={HERO_BG} alt="KeldersVisuals cinematic hero" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 hero-vignette" />
        <div className="absolute inset-0 hero-fade-bottom" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 w-full py-20">
          <div className="max-w-3xl fade-up">
            <p className="eyebrow mb-6 shimmer">Exclusieve Beeldcreatie · Sinds 2021</p>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light tracking-[0.02em] leading-[1.05] text-white mb-6">
              KELDERS<span className="text-[#D4AF37]">VISUALS</span>
            </h1>
            <div className="w-16 h-px bg-[#D4AF37] mb-6" />
            <p className="font-serif italic text-2xl sm:text-3xl text-zinc-200 mb-4">Jouw moment, onze passie.</p>
            <p className="text-zinc-400 text-base sm:text-lg leading-relaxed max-w-2xl mb-10">
              Professionele fotografie, videografie en dronebeelden die jouw verhaal zichtbaar maken.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/portfolio" data-testid="hero-portfolio-button" className="btn-gold">
                Bekijk ons werk <ArrowUpRight size={16} />
              </Link>
              <Link to="/boeken" data-testid="hero-booking-button" className="btn-outline-gold">
                Plan een shoot
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 right-8 hidden md:flex items-center gap-3 text-xs tracking-[0.3em] text-zinc-400 uppercase">
          <div className="w-8 h-px bg-[#D4AF37]" />
          <span>Scroll</span>
        </div>
      </section>

      {/* WAAROM */}
      <section className="py-24 lg:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
            <div className="lg:col-span-5">
              <p className="eyebrow mb-6">Waarom KeldersVisuals</p>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-tight mb-8">
                Meer dan alleen<br /><em className="text-[#D4AF37]">een foto.</em>
              </h2>
              <div className="gold-divider max-w-[80px] mb-8" />
              <p className="text-zinc-400 leading-relaxed mb-4">
                Bij KeldersVisuals draait het niet alleen om het maken van beelden. We leggen momenten, verhalen en de uitstraling van jouw bedrijf of merk vast op een manier die blijft hangen.
              </p>
              <p className="text-zinc-400 leading-relaxed">
                Of het nu gaat om een bedrijf, evenement, auto, portret of social-media-content: wij zorgen voor beelden die professioneel, persoonlijk en onderscheidend zijn.
              </p>
            </div>
            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
              {PILLARS.map((p, i) => (
                <div key={i} className="card-luxe p-8" data-testid={`pillar-${i}`}>
                  <p.icon size={22} className="text-[#D4AF37] mb-6" strokeWidth={1.2} />
                  <h3 className="font-serif text-xl mb-3">{p.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DIENSTEN PREVIEW */}
      <section className="py-24 lg:py-32 bg-[#0C0C10] border-y border-amber-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <p className="eyebrow mb-4">Onze Diensten</p>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-tight">
                Beeld met <em className="text-[#D4AF37]">signatuur.</em>
              </h2>
            </div>
            <Link to="/diensten" className="btn-outline-gold" data-testid="home-services-cta">
              Alle diensten <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SERVICES.slice(0, 4).map((s) => (
              <Link key={s.slug} to="/diensten" className="portfolio-item aspect-[4/5] bg-black" data-testid={`home-service-${s.slug}`}>
                <img src={s.image} alt={s.title} className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <p className="eyebrow mb-2 opacity-80">{s.slug}</p>
                  <h3 className="font-serif text-2xl">{s.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PORTFOLIO PREVIEW */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <p className="eyebrow mb-4">Selectie</p>
              <h2 className="font-serif text-4xl sm:text-5xl font-light leading-tight">Ons werk.</h2>
            </div>
            <Link to="/portfolio" className="btn-outline-gold" data-testid="home-portfolio-cta">
              Volledige portfolio <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {PORTFOLIO.slice(0, 8).map((p, i) => (
              <Link key={i} to="/portfolio" data-testid={`home-portfolio-item-${i}`} className={`portfolio-item ${i % 5 === 0 ? "row-span-2 aspect-[3/4] lg:aspect-auto" : "aspect-[4/5]"}`}>
                <img src={p.url} alt={p.title} className="w-full h-full object-cover" />
                <div className="portfolio-overlay">
                  <div>
                    <p className="eyebrow text-[10px] mb-1">{p.category}</p>
                    <p className="font-serif text-lg">{p.title}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* VOOR BEDRIJVEN */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1771270759486-1f7703945072?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000" alt="Voor bedrijven" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0C] via-[#0A0A0C]/85 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
          <div className="max-w-2xl">
            <p className="eyebrow mb-6">Voor Bedrijven</p>
            <h2 className="font-serif text-4xl sm:text-5xl font-light leading-tight mb-8">
              Laat jouw bedrijf zien<br /><em className="text-[#D4AF37]">zoals het écht is.</em>
            </h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Een professionele uitstraling begint met sterke beelden. KeldersVisuals helpt bedrijven met fotografie, bedrijfsvideo's, social-media-content en dronebeelden die passen bij hun merk.
            </p>
            <p className="text-zinc-500 leading-relaxed mb-10">
              Van eenmalige campagnes tot langdurige samenwerkingen — wij denken mee, plannen zorgvuldig en leveren beelden die commercieel én visueel presteren.
            </p>
            <Link to="/boeken" className="btn-gold" data-testid="business-booking-cta">
              Plan een zakelijke shoot <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* WERKWIJZE */}
      <section className="py-24 lg:py-32 bg-[#0C0C10] border-y border-amber-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
          <div className="text-center mb-16">
            <p className="eyebrow mb-4">Werkwijze</p>
            <h2 className="font-serif text-4xl sm:text-5xl font-light">Vier stappen. <em className="text-[#D4AF37]">Één resultaat.</em></h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative p-8 border border-amber-500/15 bg-[#0A0A0C]" data-testid={`step-${s.n}`}>
                <span className="font-serif text-6xl text-[#D4AF37]/20 absolute top-4 right-6">{s.n}</span>
                <p className="eyebrow mb-4">Stap {s.n}</p>
                <h3 className="font-serif text-2xl mb-3">{s.t}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{s.d}</p>
                {i < STEPS.length - 1 && <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-[#D4AF37]/30" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 text-center">
          <p className="eyebrow mb-6">Klaar om te starten</p>
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-light leading-[1.1] mb-8">
            Jouw moment verdient meer<br />dan een <em className="text-[#D4AF37]">standaard foto.</em>
          </h2>
          <div className="gold-divider max-w-[100px] mx-auto mb-10" />
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/boeken" className="btn-gold" data-testid="cta-booking-button">Plan een shoot</Link>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="btn-outline-gold" data-testid="cta-whatsapp-button">
              <MessageCircle size={14} /> WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
