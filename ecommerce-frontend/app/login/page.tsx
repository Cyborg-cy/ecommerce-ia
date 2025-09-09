"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { setToken, setUser } = useAuth();
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const { token, user } = await loginUser({ email, password });
      setToken(token);
      setUser?.(user); // si tu auth context guarda el usuario
      r.push("/");     // redirige a Home
    } catch (err: any) {
      setMsg(err?.response?.data?.error || "Error al iniciar sesión");
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
