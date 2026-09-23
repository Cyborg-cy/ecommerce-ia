"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type User = {
  id: number;
  name: string | null;
  email: string;
  role: "user" | "admin";
  created_at?: string;
};

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const DEFAULT_API = "http://localhost:3000";
  const RAW_BASE =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_API;

    
  // corrige si accidentalmente apunta a 3001 (front)
  const base = RAW_BASE.includes("localhost:3001") ? DEFAULT_API : RAW_BASE;

  async function load(p = 1) {
    setLoading(true);
    setErr(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const url = `${base}/admin/users?page=${p}&pageSize=${PAGE_SIZE}`;
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`GET ${url} → ${res.status} ${txt || ""}`.trim());
      }
      const data = await res.json();
      setItems(data.users ?? []);
    } catch (e: any) {
      const msg = e?.message || "No se pudo cargar usuarios";
      setErr(msg);
      toast.error(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
  }, [page]);

  async function toggleRole(u: User) {
    const nextRole = u.role === "admin" ? "user" : "admin";
    if (!confirm(`Cambiar rol de ${u.email} a "${nextRole}"?`)) return;

    try {
      setUpdatingId(u.id);
      const token = localStorage.getItem("token") || "";
      const url = `${base}/admin/users/${u.id}/role`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`PATCH ${url} → ${res.status} ${txt || ""}`.trim());
      }
      toast.success(`Rol actualizado a "${nextRole}"`);
      // update optimista
      setItems((arr) =>
        arr.map((x) => (x.id === u.id ? { ...x, role: nextRole } as User : x))
      );
    } catch (e: any) {
      console.error("toggleRole error", e);
      toast.error(e?.message || "Error al actualizar rol");
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteUser(u: User) {
    if (!confirm(`¿Eliminar al usuario ${u.email}? Esta acción no se puede deshacer.`)) return;
    try {
      setDeletingId(u.id);
      const token = localStorage.getItem("token") || "";
      const url = `${base}/admin/users/${u.id}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "El usuario tiene pedidos asociados.");
      }
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`DELETE ${url} → ${res.status} ${txt || ""}`.trim());
      }
      toast.success("Usuario eliminado");
      setItems((arr) => arr.filter((x) => x.id !== u.id));
    } catch (e: any) {
      console.error("deleteUser error", e);
      toast.error(e?.message || "No se pudo eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl">Usuarios</h1>

      {loading ? (
        <p className="text-muted">Cargando…</p>
      ) : err ? (
        <p className="text-red-600 text-sm">{err}</p>
      ) : (
        <>
          <div className="overflow-auto rounded-lg border border-border bg-surface">
            <table className="min-w-[900px] w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((u) => (
                  <tr key={u.id} className="hover:bg-background">
                    <td className="px-4 py-3 text-muted">{u.id}</td>
                    <td className="px-4 py-3 font-medium">{u.name || "—"}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          u.role === "admin" ? "bg-accent/10 text-accent" : "bg-muted/15 text-muted"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-4">
                        <button
                          onClick={() => toggleRole(u)}
                          disabled={updatingId === u.id}
                          className="text-accent hover:underline disabled:opacity-50"
                        >
                          {updatingId === u.id
                            ? "Actualizando…"
                            : u.role === "admin"
                            ? "Bajar a user"
                            : "Elevar a admin"}
                        </button>
                        <button
                          onClick={() => deleteUser(u)}
                          disabled={deletingId === u.id}
                          className="text-red-600 hover:underline disabled:opacity-50"
                        >
                          {deletingId === u.id ? "Eliminando…" : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted">
                      Sin usuarios
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* paginación simple */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3.5 py-1.5 rounded-md border border-border text-sm hover:bg-surface disabled:opacity-40"
              disabled={page === 1}
            >
              ← Anterior
            </button>
            <span className="text-sm text-muted">Página {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              className="px-3.5 py-1.5 rounded-md border border-border text-sm hover:bg-surface"
            >
              Siguiente →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
