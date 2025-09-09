"use client";

import { useState } from "react";
import { registerUser } from "@/lib/api";
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
    try {
      await registerUser({ name, email, password });
      setMsg("Cuenta creada. Ahora inicia sesión.");
      r.push("/login");
    } catch (e:any) {
      setMsg(e?.response?.data?.error || "Error registrando usuario");
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Crear cuenta</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="border w-full p-2" placeholder="Nombre"
               value={name} onChange={(e)=>setName(e.target.value)} />
        <input className="border w-full p-2" placeholder="Email"
               value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="border w-full p-2" type="password" placeholder="Contraseña"
               value={password} onChange={(e)=>setPassword(e.target.value)} />
        <button className="px-4 py-2 bg-black text-white rounded">
          Crear cuenta
        </button>
      </form>
      {msg && <p className="mt-3 text-sm text-gray-600">{msg}</p>}
    </div>
  );
}
