"use client";

import AdminGate from "@/components/AdminGate";
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

  if (loading)
    return (
      <AdminGate><div className="p-6">Cargando…</div></AdminGate>
    );

  return (
    <AdminGate>
      <div className="p-6 max-w-xl">
        <a href="/admin/categories" className="underline text-sm">← Volver</a>
        <h1 className="text-2xl font-bold mt-3">Editar categoría #{cid}</h1>

        {err ? (
          <p className="text-red-600 mt-3">{err}</p>
        ) : (
          <form onSubmit={save} className="space-y-4 mt-4">
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

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-black text-white rounded px-4 py-2 disabled:opacity-60"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded px-4 py-2 border border-red-600 text-red-600 disabled:opacity-60"
              >
                {deleting ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminGate>
  );
}