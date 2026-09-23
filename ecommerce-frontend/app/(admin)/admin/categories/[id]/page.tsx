"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Category = { id: number; name: string; description?: string | null };

export default function AdminEditCategoryPage() {
  const { id } = useParams<{ id: string }>();
  const r = useRouter();
  const cid = Number.parseInt(String(id ?? ""), 10);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState<{ name: string; description: string }>({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const DEFAULT_API = "http://localhost:3000";
  const RAW_BASE =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_API;
  const base = RAW_BASE.includes("localhost:3001") ? DEFAULT_API : RAW_BASE;

  useEffect(() => {
    if (!Number.isInteger(cid) || cid <= 0) {
      setErr("ID inválido");
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const res = await fetch(`${base}/admin/categories`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        });
        if (!res.ok) throw new Error("No se pudo cargar categorías");
        const list: Category[] = await res.json();
        const c = list.find((x) => x.id === cid);
        if (!c) throw new Error("Categoría no encontrada");
        if (!alive) return;
        setF({ name: c.name, description: c.description ?? "" });
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Error al cargar");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [cid, base]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) { setErr("El nombre es obligatorio."); return; }
    try {
      setSaving(true);
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${base}/admin/categories/${cid}`, {
        method: "PUT",
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
        const txt = await res.text();
        throw new Error(`PUT /admin/categories/${cid} → ${res.status} ${txt || ""}`.trim());
      }
      toast.success("Categoría guardada");
      r.push("/admin/categories");
    } catch (e: any) {
      setErr(e?.message || "Error al guardar");
      toast.error(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar categoría #${cid}?`)) return;
    try {
      setDeleting(true);
      const token = localStorage.getItem("token") || "";
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      let url = `${base}/admin/categories/${cid}`;
      let res = await fetch(url, { method: "DELETE", headers });

      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        const msg = data?.error || "La categoría tiene productos asociados.";
        const input = prompt(
          `${msg}\n\nIngresa el ID de otra categoría para reasignar los productos y eliminar:`,
          ""
        );
        if (!input) { setDeleting(false); return; }
        const dst = Number.parseInt(input, 10);
        if (!Number.isInteger(dst) || dst <= 0 || dst === cid) {
          alert("ID de categoría destino inválido.");
          setDeleting(false);
          return;
        }
        url = `${base}/admin/categories/${cid}?reassignTo=${dst}`;
        res = await fetch(url, { method: "DELETE", headers });
      }

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`DELETE ${url} → ${res.status} ${txt || ""}`.trim());
      }

      toast.success(`Categoría #${cid} eliminada`);
      r.push("/admin/categories");
    } catch (e: any) {
      toast.error(e?.message || "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className="text-muted">Cargando…</div>;

  return (
    <div className="max-w-xl">
      <a href="/admin/categories" className="text-sm text-muted hover:text-foreground transition-colors">← Volver</a>
      <h1 className="font-serif text-2xl mt-3 mb-6">Editar categoría #{cid}</h1>

      {err ? (
        <p className="text-red-600">{err}</p>
      ) : (
        <form onSubmit={save} className="space-y-5">
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

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md px-5 py-2.5 bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-md px-5 py-2.5 border border-red-600 text-red-600 text-sm hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? "Eliminando…" : "Eliminar"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}