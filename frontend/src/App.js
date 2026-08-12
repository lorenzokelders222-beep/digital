import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Services from "./pages/Services";
import Portfolio from "./pages/Portfolio";
import About from "./pages/About";
import Booking from "./pages/Booking";
import BookingConfirmation from "./pages/BookingConfirmation";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import MyAccount from "./pages/MyAccount";
import AdminDashboard from "./pages/AdminDashboard";
import "./App.css";

function Legal({ title }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-16 lg:py-24">
      <p className="eyebrow mb-4">Juridisch</p>
      <h1 className="font-serif text-4xl sm:text-5xl mb-6">{title}</h1>
      <div className="gold-divider max-w-[80px] mb-8" />
      <p className="text-zinc-400 leading-relaxed">
        Deze pagina wordt op maat ingevuld. Neem gerust contact op via info@keldersvisuals.nl voor de meest recente versie.
      </p>
    </div>
  );
}

// Admin-only wrapper
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="py-32 text-center text-zinc-500">Laden…</div>;
  if (!user) return <Navigate to="/login" state={{ from: "/admin" }} replace />;
  if (!user.is_admin) return <Navigate to="/mijn-account" replace />;
  return children;
}

function AppRouter() {
  // CRITICAL: read hash from useLocation (reactive), not window.location.hash
  const location = useLocation();
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Layout>
              <AdminDashboard />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="*"
        element={
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/diensten" element={<Services />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/over-ons" element={<About />} />
              <Route path="/boeken" element={<Booking />} />
              <Route path="/boeking-bevestiging/:id" element={<BookingConfirmation />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/mijn-account" element={<MyAccount />} />
              <Route path="/privacy" element={<Legal title="Privacybeleid" />} />
              <Route path="/voorwaarden" element={<Legal title="Algemene voorwaarden" />} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-center"
          theme="dark"
          toastOptions={{
            style: {
              background: "#121216",
              color: "#F4F4F6",
              border: "1px solid rgba(212,175,55,0.3)",
            },
          }}
        />
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}
