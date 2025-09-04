"use client";

"use client";

import { useState } from "react";
import { loginUser } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { token } = await loginUser({ email, password });
      localStorage.setItem("token", token);
      router.push("/"); // o /products
    } catch (e: any) {
      const detail =
        e?.response?.data?.error ||
        e?.message ||
        "Error desconocido al iniciar sesión";
      setErr(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Iniciar sesión</h1>
      <form className="space-y-3" onSubmit={submit}>
        <input
          className="w-full border rounded p-2"
          placeholder="Correo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="w-full border rounded p-2"
          placeholder="Contraseña"
          type="password"
          value={password}
          minLength={6}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          className="w-full bg-black text-white rounded p-2 disabled:opacity-50"
          type="submit"
          disabled={loading}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      {err && <p className="text-red-600">❌ {err}</p>}
    </div>
  );
}
