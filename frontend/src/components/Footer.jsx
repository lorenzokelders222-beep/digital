import { Link } from "react-router-dom";
import { Instagram, Facebook, Music2, Mail, Phone } from "lucide-react";
import { WHATSAPP_URL, PHONE_HREF, MAIL_HREF } from "../lib/services";

export default function Footer() {
  return (
    <footer data-testid="site-footer" className="relative bg-[#0A0A0C] border-t border-amber-500/10 pt-24 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 grid gap-12 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-2 h-2 rotate-45 bg-[#D4AF37]" />
            <span className="font-serif text-2xl tracking-[0.25em]">KELDERSVISUALS</span>
          </div>
          <p className="font-serif italic text-lg text-[#D4AF37]/90 mb-4">Jouw moment, onze passie.</p>
          <p className="text-zinc-500 text-sm max-w-md leading-relaxed">
            High-end fotografie, videografie, drone & FPV — beelden die vertrouwen wekken en verhalen laten voortbestaan.
          </p>
        </div>

        <div>
          <p className="eyebrow mb-5">Navigatie</p>
          <ul className="space-y-3 text-sm text-zinc-400">
            <li><Link to="/" className="hover:text-[#D4AF37] transition-colors">Home</Link></li>
            <li><Link to="/diensten" className="hover:text-[#D4AF37] transition-colors">Diensten</Link></li>
            <li><Link to="/portfolio" className="hover:text-[#D4AF37] transition-colors">Portfolio</Link></li>
            <li><Link to="/over-ons" className="hover:text-[#D4AF37] transition-colors">Over ons</Link></li>
            <li><Link to="/boeken" className="hover:text-[#D4AF37] transition-colors">Boeken</Link></li>
            <li><Link to="/contact" className="hover:text-[#D4AF37] transition-colors">Contact</Link></li>
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-5">Contact</p>
          <ul className="space-y-3 text-sm text-zinc-400">
            <li><a href={MAIL_HREF} className="hover:text-[#D4AF37] flex items-center gap-2"><Mail size={14} /> info@keldersvisuals.nl</a></li>
            <li><a href={PHONE_HREF} className="hover:text-[#D4AF37] flex items-center gap-2"><Phone size={14} /> 06-15133571</a></li>
            <li><a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="hover:text-[#D4AF37]">WhatsApp</a></li>
          </ul>
          <div className="flex gap-4 mt-6">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="w-9 h-9 border border-amber-500/20 flex items-center justify-center text-zinc-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/60 transition-all"><Instagram size={16} /></a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="w-9 h-9 border border-amber-500/20 flex items-center justify-center text-zinc-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/60 transition-all"><Facebook size={16} /></a>
            <a href="https://tiktok.com" target="_blank" rel="noreferrer" className="w-9 h-9 border border-amber-500/20 flex items-center justify-center text-zinc-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/60 transition-all"><Music2 size={16} /></a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 mt-16 pt-8 border-t border-amber-500/10 flex flex-col md:flex-row justify-between gap-4 text-xs text-zinc-500">
        <p>© {new Date().getFullYear()} KeldersVisuals — Alle rechten voorbehouden.</p>
        <div className="flex gap-6">
          <Link to="/privacy" className="hover:text-[#D4AF37]">Privacybeleid</Link>
          <Link to="/voorwaarden" className="hover:text-[#D4AF37]">Algemene voorwaarden</Link>
        </div>
      </div>
    </footer>
  );
}
