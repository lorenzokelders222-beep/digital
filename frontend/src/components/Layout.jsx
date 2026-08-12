import Navigation from "./Navigation";
import Footer from "./Footer";
import FloatingWhatsApp from "./FloatingWhatsApp";
import AIChat from "./AIChat";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-100">
      <Navigation />
      <main className="pt-20">{children}</main>
      <Footer />
      <FloatingWhatsApp />
      <AIChat />
    </div>
  );
}
