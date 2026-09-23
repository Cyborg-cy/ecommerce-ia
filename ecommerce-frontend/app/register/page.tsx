"use client";

import { useState } from "react";
import { registerUser } from "@/lib/api-client";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const r = useRouter();
  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [msg,setMsg] = useState<string|null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    // Validación rápida de campos requeridos con mensajes específicos
    if (!name.trim()) {
      setMsg("El nombre es obligatorio.");
      return;
    }
    if (!email.trim()) {
      setMsg("El correo electrónico es obligatorio.");
      return;
    }
    if (!password) {
      setMsg("La contraseña es obligatoria.");
      return;
    }
    try {
      await registerUser({ name, email, password });
      setMsg("Cuenta creada. Ahora inicia sesión.");
      r.push("/login");
    } catch (e:any) {
      setMsg(e?.response?.data?.error || "Error registrando usuario");
    }
  }

  return (
    <div className="max-w-sm mx-auto px-6 py-16">
      <h1 className="font-serif text-3xl mb-1">Crear cuenta</h1>
      <p className="text-muted text-sm mb-8">Regístrate para comprar y ver tu historial de pedidos.</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1.5 text-foreground/80">Nombre</label>
          <input
            className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm focus:border-accent"
            value={name}
            onChange={(e)=>setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5 text-foreground/80">Email</label>
          <input
            className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm focus:border-accent"
            type="email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5 text-foreground/80">Contraseña</label>
          <input
            className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm focus:border-accent"
            type="password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            required
          />
        </div>
        <button className="w-full rounded-md px-4 py-2.5 bg-foreground text-background text-sm font-medium hover:opacity-90">
          Crear cuenta
        </button>
      </form>
      {msg && <p className="mt-4 text-sm text-muted">{msg}</p>}
      <p className="text-sm text-muted mt-6">
        ¿Ya tienes cuenta?{" "}
        <a href="/login" className="text-accent hover:underline">
          Entra
        </a>
      </p>
    </div>
  );
}
