"use client";

import AdminGate from "@/components/AdminGate";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth"; 

type Category = {
  id: number;
  name: string;
  description?: string | null;
};

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // edición en línea
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<{ name: string; description: string }>({
    name: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const DEFAULT_API = "http://localhost:3000";
const RAW_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  DEFAULT_API;

// si por error viene 3001 (frontend), corrige a 3000 (backend)
const base = RAW_BASE.includes("localhost:3001") ? DEFAULT_API : RAW_BASE;

  async function load() {
  setLoading(true);
setErr(null);
try {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  // 1) Intentar listado admin
  const urlAdmin = `${base}/admin/categories`;
  console.log("GET", urlAdmin);
  let res = await fetch(urlAdmin, { headers, cache: "no-store" });

  // 2) Fallback público si no existe o acceso denegado
  if (res.status === 404 || res.status === 403) {
    const urlPub = `${base}/categories`;
    console.log("GET (fallback)", urlPub);
    res = await fetch(urlPub, { cache: "no-store" });
  }

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GET ${res.url} → ${res.status} ${txt || ""}`.trim());
  }

  const data = await res.json();
  const arr: Category[] = Array.isArray(data) ? data : (data.items ?? data.rows ?? []);
  setItems(arr ?? []);
} catch (e: any) {
  const msg = e?.message || "No se pudo cargar categorías";
  setErr(msg);
  toast.error(msg);
  setItems([]);
} finally {
  setLoading(false);
}

  }

  useEffect(() => {
    load();
  }, []);

  // ----- edición en línea -----
  function startEdit(c: Category) {
    setEditingId(c.id);
    setForm({ name: c.name, description: c.description ?? "" });
  }
  function cancelEdit() {
    setEditingId(null);
    setForm({ name: "", description: "" });
  }

  // ⬇️ Guardar (PUT /categories/:id)
async function saveEdit(id: number) {
  if (!form.name.trim()) {
    toast.error("El nombre es obligatorio");
    return;
  }
  setSaving(true);
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
    const token = localStorage.getItem("token") || "";
    const res = await fetch(`${base}/categories/${id}`, {
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
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || `Error ${res.status}`);
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
    const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
    const token = localStorage.getItem("token") || "";
    let res = await fetch(`${base}/categories/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    // Si el backend pide reasignar (409), pedimos el ID destino y repetimos
    if (res.status === 409) {
      const data = await res.json().catch(() => ({}));
      const msg = data?.error || "La categoría tiene productos asociados.";
      const input = prompt(`${msg}\n\nID de categoría destino:`, "");
      if (!input) return;
      const dst = Number.parseInt(input, 10);
      if (!Number.isInteger(dst) || dst <= 0 || dst === id) {
        alert("ID de categoría destino inválido.");
        return;
      }
      res = await fetch(`${base}/categories/${id}?reassignTo=${dst}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || `Error ${res.status}`);
    }
    toast.success(`Categoría #${id} eliminada`);
    await load();
  } catch (e: any) {
    toast.error(e?.message || "Error al eliminar");
  }
}

  return (
    <AdminGate>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Categorías</h1>
          <Link href="/admin/categories/new" className="px-3 py-1 rounded bg-black text-white text-sm">
            Nueva
          </Link>
        </div>

        {loading ? (
          <p>Cargando…</p>
        ) : err ? (
          <p className="text-red-600 text-sm">{err}</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-[700px] w-full border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 border text-left">ID</th>
                  <th className="p-2 border text-left">Nombre</th>
                  <th className="p-2 border text-left">Descripción</th>
                  <th className="p-2 border text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => {
                  const isEditing = editingId === c.id;
                  return (
                    <tr key={c.id} className="border-t">
                      <td className="p-2 border">{c.id}</td>

                      <td className="p-2 border">
                        {isEditing ? (
                          <input
                            className="border rounded px-2 py-1 w-full"
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            autoFocus
                          />
                        ) : (
                          c.name
                        )}
                      </td>

                      <td className="p-2 border">
                        {isEditing ? (
                          <input
                            className="border rounded px-2 py-1 w-full"
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                          />
                        ) : (
                          c.description ?? "—"
                        )}
                      </td>

                      <td className="p-2 border">
                        
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(c.id)}
                              disabled={saving}
                              className="px-3 py-1 rounded bg-black text-white text-sm disabled:opacity-60"
                            >
                              {saving ? "Guardando…" : "Guardar"}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-1 rounded border text-sm"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-3">
                            <button
                              onClick={() => startEdit(c)}
                              className="underline text-sm"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => delCategory(c.id)}
                              disabled={deletingId === c.id}
                              className="underline text-sm text-red-600 disabled:opacity-60"
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
                    <td colSpan={4} className="p-4 text-center text-gray-500">
                      Sin categorías
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminGate>
  );
}
