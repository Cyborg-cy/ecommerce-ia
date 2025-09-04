"use client";
import { useState } from "react";
import { registerUser } from "@/lib/api";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();              // <--- evita submit clásico
    setMsg(null);
    setLoading(true);
    try {
      await registerUser({ name, email, password });
      setMsg("✅ Cuenta creada. Ahora inicia sesión.");
      setName(""); setEmail(""); setPassword("");
    } catch (err: any) {
      console.error(err);
      setMsg(
        (err?.response?.data?.error as string) ||
        err?.message ||
        "Error registrando usuario"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Crear cuenta</h1>

      <form onSubmit={submit} /* sin action */>
        <label className="block mb-2">
          <span>Nombre</span>
          <input
            className="border rounded w-full p-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </label>

        <label className="block mb-2">
          <span>Email</span>
          <input
            className="border rounded w-full p-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label className="block mb-4">
          <span>Contraseña</span>
          <input
            className="border rounded w-full p-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Creando..." : "Crear cuenta"}
        </button>
      </form>

      {msg && <p className="mt-4 text-sm">{msg}</p>}
    </div>
  );
}