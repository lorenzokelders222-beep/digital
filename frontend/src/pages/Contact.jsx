import { useState } from "react";
import { toast } from "sonner";
import { Mail, Phone, MessageCircle, MapPin, ArrowUpRight } from "lucide-react";
import api from "../lib/api";
import { SERVICES, WHATSAPP_URL, PHONE_HREF, MAIL_HREF } from "../lib/services";

const initial = { name: "", email: "", phone: "", company: "", shoot_type: "", preferred_date: "", message: "" };

export default function Contact() {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);

  const change = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Vul minimaal je naam, e-mail en bericht in.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/contact", form);
      toast.success("Bericht verzonden. We nemen snel contact op.");
      setForm(initial);
    } catch {
      toast.error("Er ging iets mis. Probeer het opnieuw of app ons via WhatsApp.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
        <div className="max-w-3xl mb-16">
          <p className="eyebrow mb-4">Contact</p>
          <h1 className="font-serif text-5xl sm:text-6xl font-light leading-tight mb-6">
            Klaar om jouw verhaal<br /><em className="text-[#D4AF37]">vast te leggen?</em>
          </h1>
          <div className="gold-divider max-w-[80px] mb-6" />
          <p className="text-zinc-400 leading-relaxed">
            Heb je een idee, een vraag of wil je weten wat we voor jou kunnen betekenen? Neem vrijblijvend contact met ons op.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-10">
          {/* Form */}
          <form onSubmit={submit} data-testid="contact-form" className="lg:col-span-8 card-luxe p-8 lg:p-10 space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="eyebrow block mb-2">Naam *</label>
                <input data-testid="contact-name" className="input-luxe" value={form.name} onChange={change("name")} required />
              </div>
              <div>
                <label className="eyebrow block mb-2">E-mail *</label>
                <input data-testid="contact-email" type="email" className="input-luxe" value={form.email} onChange={change("email")} required />
              </div>
              <div>
                <label className="eyebrow block mb-2">Telefoon</label>
                <input data-testid="contact-phone" className="input-luxe" value={form.phone} onChange={change("phone")} />
              </div>
              <div>
                <label className="eyebrow block mb-2">Bedrijf</label>
                <input data-testid="contact-company" className="input-luxe" value={form.company} onChange={change("company")} />
              </div>
              <div>
                <label className="eyebrow block mb-2">Type shoot</label>
                <select data-testid="contact-shoot-type" className="input-luxe" value={form.shoot_type} onChange={change("shoot_type")}>
                  <option value="">Kies een dienst</option>
                  {SERVICES.map((s) => <option key={s.slug} value={s.title}>{s.title}</option>)}
                </select>
              </div>
              <div>
                <label className="eyebrow block mb-2">Gewenste datum</label>
                <input data-testid="contact-date" type="date" className="input-luxe" value={form.preferred_date} onChange={change("preferred_date")} />
              </div>
            </div>
            <div>
              <label className="eyebrow block mb-2">Bericht *</label>
              <textarea data-testid="contact-message" rows={6} className="input-luxe resize-none" value={form.message} onChange={change("message")} required />
            </div>
            <button type="submit" disabled={loading} className="btn-gold w-full sm:w-auto" data-testid="contact-form-submit-button">
              {loading ? "Verzenden…" : "Verstuur bericht"} <ArrowUpRight size={16} />
            </button>
          </form>

          {/* Contact side */}
          <aside className="lg:col-span-4 space-y-4">
            <a href={MAIL_HREF} data-testid="contact-side-email" className="card-luxe p-6 flex items-start gap-4 group">
              <Mail size={20} className="text-[#D4AF37] mt-1" strokeWidth={1.2} />
              <div>
                <p className="eyebrow mb-1">E-mail</p>
                <p className="text-zinc-100 group-hover:text-[#D4AF37] transition-colors">info@keldersvisuals.nl</p>
              </div>
            </a>
            <a href={PHONE_HREF} data-testid="contact-side-phone" className="card-luxe p-6 flex items-start gap-4 group">
              <Phone size={20} className="text-[#D4AF37] mt-1" strokeWidth={1.2} />
              <div>
                <p className="eyebrow mb-1">Telefoon</p>
                <p className="text-zinc-100 group-hover:text-[#D4AF37] transition-colors">06-15133571</p>
              </div>
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" data-testid="contact-side-whatsapp" className="card-luxe p-6 flex items-start gap-4 group">
              <MessageCircle size={20} className="text-[#D4AF37] mt-1" strokeWidth={1.2} />
              <div>
                <p className="eyebrow mb-1">WhatsApp</p>
                <p className="text-zinc-100 group-hover:text-[#D4AF37] transition-colors">Direct contact</p>
              </div>
            </a>
            <div className="card-luxe p-6 flex items-start gap-4">
              <MapPin size={20} className="text-[#D4AF37] mt-1" strokeWidth={1.2} />
              <div>
                <p className="eyebrow mb-1">Werkgebied</p>
                <p className="text-zinc-300 text-sm">Nederland — op locatie of studio</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
