"use client";

import AdminGate from "@/components/AdminGate";
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

  const DEFAULT_API = "http://localhost:3000";
  const RAW_BASE =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_API;
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
      // Optimista: actualiza en memoria
      setItems((arr) =>
        arr.map((x) => (x.id === u.id ? { ...x, role: nextRole } as User : x))
      );
    } catch (e: any) {
      toast.error(e?.message || "Error al actualizar rol");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <AdminGate>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Usuarios</h1>
          {/* si quieres filtros/búsqueda, los agregamos luego */}
        </div>

        {loading ? (
          <p>Cargando…</p>
        ) : err ? (
          <p className="text-red-600 text-sm">{err}</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-[800px] w-full border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 border text-left">ID</th>
                  <th className="p-2 border text-left">Nombre</th>
                  <th className="p-2 border text-left">Email</th>
                  <th className="p-2 border text-left">Rol</th>
                  <th className="p-2 border text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="p-2 border">{u.id}</td>
                    <td className="p-2 border">{u.name || "—"}</td>
                    <td className="p-2 border">{u.email}</td>
                    <td className="p-2 border">{u.role}</td>
                    <td className="p-2 border">
                      <button
                        onClick={() => toggleRole(u)}
                        disabled={updatingId === u.id}
                        className="underline text-sm disabled:opacity-60"
                      >
                        {updatingId === u.id
                          ? "Actualizando…"
                          : u.role === "admin"
                          ? "Bajar a user"
                          : "Elevar a admin"}
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500">
                      Sin usuarios
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* paginita simple; si no la necesitas, la quitamos */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border rounded text-sm"
                disabled={page === 1}
              >
                ← Anterior
              </button>
              <span className="text-sm">Página {page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border rounded text-sm"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminGate>
  );
}
