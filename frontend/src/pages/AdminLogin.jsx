import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import api from "../lib/api";

export default function AdminLogin() {
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/admin/login", form);
      localStorage.setItem("kv_admin_token", res.data.token);
      localStorage.setItem("kv_admin_email", res.data.email);
      toast.success("Ingelogd");
      nav("/admin");
    } catch {
      toast.error("Ongeldige inloggegevens");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <form onSubmit={submit} className="card-luxe p-8 lg:p-10 w-full max-w-md" data-testid="admin-login-form">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full border border-[#D4AF37] flex items-center justify-center">
            <Lock size={16} className="text-[#D4AF37]" />
          </div>
          <div>
            <p className="eyebrow">Admin</p>
            <p className="font-serif text-xl">KeldersVisuals</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="eyebrow block mb-2">E-mail</label>
            <input
              data-testid="admin-email-input"
              type="email"
              className="input-luxe"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="eyebrow block mb-2">Wachtwoord</label>
            <input
              data-testid="admin-password-input"
              type="password"
              className="input-luxe"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" disabled={loading} data-testid="admin-login-button" className="btn-gold w-full justify-center mt-2">
            {loading ? "Inloggen…" : "Inloggen"}
          </button>
        </div>
      </form>
    </div>
  );
}
