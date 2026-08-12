import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, MessageCircle, User as UserIcon, LogOut } from "lucide-react";
import { WHATSAPP_URL } from "../lib/services";
import { useAuth } from "../context/AuthContext";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/diensten", label: "Diensten" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/over-ons", label: "Over ons" },
  { to: "/boeken", label: "Boeken" },
  { to: "/contact", label: "Contact" },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const loc = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpen(false); setMenuOpen(false); }, [loc.pathname]);

  return (
    <header
      data-testid="site-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "bg-black/80 backdrop-blur-xl border-b border-amber-500/10" : "bg-transparent"}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
        <div className="flex items-center justify-between h-20">
          <Link to="/" data-testid="nav-logo" className="flex items-center gap-3 group">
            <span className="w-2 h-2 rotate-45 bg-[#D4AF37]" />
            <span className="font-serif text-xl sm:text-2xl tracking-[0.25em] text-white group-hover:text-[#D4AF37] transition-colors">
              KELDERSVISUALS
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-10">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                data-testid={`nav-link-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={({ isActive }) =>
                  `text-[13px] tracking-[0.15em] uppercase transition-colors ${isActive ? "text-[#D4AF37]" : "text-zinc-300 hover:text-white"}`
                }
                end={l.to === "/"}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              data-testid="nav-whatsapp-cta"
              className="hidden md:inline-flex items-center gap-2 text-[12px] tracking-[0.2em] uppercase text-[#D4AF37] border border-[#D4AF37]/40 px-4 py-2 hover:bg-[#D4AF37] hover:text-black transition-all"
            >
              <MessageCircle size={14} /> WhatsApp
            </a>

            {/* User menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  data-testid="nav-user-menu"
                  className="flex items-center gap-2 pl-1 pr-3 py-1 border border-amber-500/30 hover:border-[#D4AF37] transition-colors"
                >
                  {user.picture ? (
                    <img src={user.picture} alt="" className="w-7 h-7 rounded-full" />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center text-xs font-serif">
                      {(user.name || user.email)[0]?.toUpperCase()}
                    </span>
                  )}
                  <span className="hidden md:block text-xs tracking-widest uppercase text-zinc-200 max-w-[100px] truncate">
                    {user.name?.split(" ")[0] || user.email}
                  </span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-[#121216] border border-amber-500/20 py-2 shadow-xl">
                    <Link to="/mijn-account" className="block px-4 py-2 text-sm text-zinc-200 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]" data-testid="user-menu-account">
                      <UserIcon size={12} className="inline mr-2" /> Mijn account
                    </Link>
                    {user.is_admin && (
                      <Link to="/admin" className="block px-4 py-2 text-sm text-zinc-200 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]" data-testid="user-menu-admin">
                        Admin dashboard
                      </Link>
                    )}
                    <div className="border-t border-amber-500/10 my-1" />
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-sm text-zinc-200 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]"
                      data-testid="user-menu-logout"
                    >
                      <LogOut size={12} className="inline mr-2" /> Uitloggen
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                data-testid="nav-login-cta"
                className="hidden md:inline-flex text-[12px] tracking-[0.2em] uppercase text-zinc-200 hover:text-[#D4AF37] px-2 py-2"
              >
                Inloggen
              </Link>
            )}

            <button
              className="lg:hidden text-white p-2"
              onClick={() => setOpen(!open)}
              data-testid="mobile-menu-toggle"
              aria-label="Menu"
            >
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        data-testid="mobile-menu"
        className={`lg:hidden overflow-hidden transition-all duration-500 bg-black/95 backdrop-blur-xl border-t border-amber-500/10 ${open ? "max-h-[600px]" : "max-h-0"}`}
      >
        <div className="px-6 py-8 flex flex-col gap-6">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `text-lg font-serif tracking-wide ${isActive ? "text-[#D4AF37]" : "text-zinc-200"}`
              }
              end={l.to === "/"}
              data-testid={`mobile-nav-link-${l.label.toLowerCase()}`}
            >
              {l.label}
            </NavLink>
          ))}
          <div className="border-t border-amber-500/10 pt-6 flex flex-col gap-4">
            {user ? (
              <>
                <Link to="/mijn-account" className="text-lg font-serif text-zinc-200">Mijn account</Link>
                {user.is_admin && <Link to="/admin" className="text-lg font-serif text-zinc-200">Admin</Link>}
                <button onClick={logout} className="text-lg font-serif text-left text-zinc-200">Uitloggen</button>
              </>
            ) : (
              <Link to="/login" className="text-lg font-serif text-zinc-200" data-testid="mobile-login-link">Inloggen</Link>
            )}
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="btn-gold justify-center mt-2" data-testid="mobile-whatsapp-cta">
              <MessageCircle size={14} /> WhatsApp
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
