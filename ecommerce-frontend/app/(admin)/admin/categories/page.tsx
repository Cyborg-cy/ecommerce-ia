"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth"; 

type Category = { id: number; name: string; description?: string | null };

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<{ name: string; description: string }>({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const DEFAULT_API = "http://localhost:3000";
  const RAW_BASE =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_API;
  const base = RAW_BASE.includes("localhost:3001") ? DEFAULT_API : RAW_BASE;

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const url = `${base}/admin/categories`;
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`GET ${url} → ${res.status} ${txt || ""}`.trim());
      }
      const data: Category[] = await res.json();
      setItems(data ?? []);
    } catch (e: any) {
      const msg = e?.message || "No se pudo cargar categorías";
      setErr(msg);
      toast.error(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(c: Category) {
    setEditingId(c.id);
    setForm({ name: c.name, description: c.description ?? "" });
  }
  function cancelEdit() {
    setEditingId(null);
    setForm({ name: "", description: "" });
  }

  async function saveEdit(id: number) {
    if (!form.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    try {
      setSaving(true);
      const token = localStorage.getItem("token") || "";
      const url = `${base}/admin/categories/${id}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`PUT ${url} → ${res.status} ${txt || ""}`.trim());
      }
      toast.success("Categoría guardada");
      setEditingId(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function delCategory(id: number) {
    if (!confirm(`¿Eliminar categoría #${id}?`)) return;

    try {
      setDeletingId(id);
      const token = localStorage.getItem("token") || "";
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      // intento directo
      let url = `${base}/admin/categories/${id}`;
      let res = await fetch(url, { method: "DELETE", headers });

      // si hay productos asociados, pide reasignación
      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        const msg = data?.error || "La categoría tiene productos asociados.";
        const input = prompt(
          `${msg}\n\nIngresa el ID de otra categoría para reasignar los productos y eliminar:`,
          ""
        );
        if (!input) { setDeletingId(null); return; }
        const dst = Number.parseInt(input, 10);
        if (!Number.isInteger(dst) || dst <= 0 || dst === id) {
          alert("ID de categoría destino inválido.");
          setDeletingId(null);
          return;
        }
        url = `${base}/admin/categories/${id}?reassignTo=${dst}`;
        res = await fetch(url, { method: "DELETE", headers });
      }

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`DELETE ${url} → ${res.status} ${txt || ""}`.trim());
      }

      toast.success(`Categoría #${id} eliminada`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">Categorías</h1>
        <Link href="/admin/categories/new" className="px-3.5 py-1.5 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-hover">
          Nueva
        </Link>
      </div>

      {loading ? (
        <p className="text-muted">Cargando…</p>
      ) : err ? (
        <p className="text-red-600 text-sm">{err}</p>
      ) : (
        <div className="overflow-auto rounded-lg border border-border bg-surface">
          <table className="min-w-[700px] w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Descripción</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((c) => {
                const isEditing = editingId === c.id;
                return (
                  <tr key={c.id} className="hover:bg-background">
                    <td className="px-4 py-3 text-muted">{c.id}</td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          className="rounded-md border border-border bg-surface px-2.5 py-1.5 w-full focus:border-accent"
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium">{c.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          className="rounded-md border border-border bg-surface px-2.5 py-1.5 w-full focus:border-accent"
                          value={form.description}
                          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        />
                      ) : (
                        <span className="text-muted">{c.description ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex gap-3">
                          <button
                            onClick={() => saveEdit(c.id)}
                            disabled={saving}
                            className="px-3 py-1.5 rounded-md bg-accent text-accent-foreground text-sm disabled:opacity-50"
                          >
                            {saving ? "Guardando…" : "Guardar"}
                          </button>
                          <button onClick={cancelEdit} className="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-background">
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-4">
                          <button onClick={() => startEdit(c)} className="text-accent hover:underline">
                            Editar
                          </button>
                          <button
                            onClick={() => delCategory(c.id)}
                            disabled={deletingId === c.id}
                            className="text-red-600 hover:underline disabled:opacity-50"
                          >
                            {deletingId === c.id ? "Eliminando…" : "Eliminar"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    Sin categorías
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}