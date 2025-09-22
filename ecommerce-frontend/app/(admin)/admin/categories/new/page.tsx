"use client";

import AdminGate from "@/components/AdminGate";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

export default function AdminNewCategoryPage() {
  const r = useRouter();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", description: "" });

    const DEFAULT_API = "http://localhost:3000";
  const RAW_BASE =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_API;
  const base = RAW_BASE.includes("localhost:3001") ? DEFAULT_API : RAW_BASE;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!f.name.trim()) {
      setErr("El nombre es obligatorio.");
      return;
    }
    try {
      setSaving(true);
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${base}/admin/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: f.name.trim(),
          description: f.description.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "No se pudo crear la categoría");
      }
      toast.success("Categoría creada");
      r.push("/admin/categories");
    } catch (e: any) {
      setErr(e?.message || "Error al crear categoría");
      toast.error(e?.message || "Error al crear categoría");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminGate>
      <div className="p-6 max-w-xl">
        <a href="/admin/categories" className="underline text-sm">← Volver</a>
        <h1 className="text-2xl font-bold mt-3">Nueva categoría</h1>

        <form onSubmit={submit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm">Nombre</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              required
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm">Descripción (opcional)</label>
            <textarea
              className="border rounded px-3 py-2 w-full"
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
              autoComplete="off"
            />
          </div>

          {err && <p className="text-red-600 text-sm">{err}</p>}

          <button
            disabled={saving}
            className="bg-black text-white rounded px-4 py-2 disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Crear"}
          </button>
        </form>
      </div>
    </AdminGate>
  );
}
