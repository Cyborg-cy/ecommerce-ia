"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginUser } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import toast from "react-hot-toast";

/** 
 * Extrae toda tu lógica actual a un componente interno.
 * Este componente SÍ usa useSearchParams y lo montamos dentro de <Suspense>.
 */
function LoginInner() {
  const { login } = useAuth();
  const sp = useSearchParams();
  const r = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Si ya hay token, salta el login y ve al destino
  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (t) {
      const next = sp.get("next") || "/admin"; // vuelve a donde ibas (por defecto /admin)
      r.replace(next);
      return;
    }
    if (sp.get("expired") === "1") {
      setMsg("Tu sesión expiró, inicia sesión de nuevo.");
    }
  }, [sp, r]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await loginUser({ email, password }); // { accessToken, refreshToken }
      if (!res?.accessToken) throw new Error("Respuesta inválida del servidor (sin token).");

      login(res.accessToken, res.refreshToken);

      toast.success("Bienvenido!");

      const next = sp.get("next") || "/admin";
      r.replace(next);
    } catch (err: any) {
      setMsg(err?.response?.data?.error || err?.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Entrar</h1>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            className="w-full border rounded px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Contraseña</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {msg && <p className="text-red-600 text-sm">{msg}</p>}

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

/**
 * Página exportada: envuelve LoginInner con <Suspense>.
 * Esto satisface el requisito de Next para useSearchParams en App Router.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6">Cargando…</div>}>
      <LoginInner />
    </Suspense>
  );
}
