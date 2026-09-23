"use client";

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
    <div className="max-w-xl">
      <a href="/admin/categories" className="text-sm text-muted hover:text-foreground transition-colors">← Volver</a>
      <h1 className="font-serif text-2xl mt-3 mb-6">Nueva categoría</h1>

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-sm mb-1.5 text-foreground/80">Nombre</label>
          <input
            className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm focus:border-accent"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            required
            autoComplete="off"
          />
        </div>

        <div>
          <label className="block text-sm mb-1.5 text-foreground/80">Descripción (opcional)</label>
          <textarea
            className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm focus:border-accent"
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            autoComplete="off"
          />
        </div>

        {err && <p className="text-red-600 text-sm">{err}</p>}

        <button
          disabled={saving}
          className="rounded-md px-5 py-2.5 bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Crear"}
        </button>
      </form>
    </div>
  );
}
