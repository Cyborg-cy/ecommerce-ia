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
      const next = sp.get("next") || "/"; // vuelve a donde ibas (por defecto home)
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

      const next = sp.get("next") || "/";
      r.replace(next);
    } catch (err: any) {
      setMsg(err?.response?.data?.error || err?.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto px-6 py-16">
      <h1 className="font-serif text-3xl mb-1">Entrar</h1>
      <p className="text-muted text-sm mb-8">Accede a tu cuenta para ver tus pedidos y carrito.</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1.5 text-foreground/80">Email</label>
          <input
            type="email"
            className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm focus:border-accent"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5 text-foreground/80">Contraseña</label>
          <input
            type="password"
            className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm focus:border-accent"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {msg && <p className="text-sm text-red-600">{msg}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md px-4 py-2.5 bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <p className="text-sm text-muted mt-6">
        ¿No tienes cuenta?{" "}
        <a href="/register" className="text-accent hover:underline">
          Crea una
        </a>
      </p>
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
