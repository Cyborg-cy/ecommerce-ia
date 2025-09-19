"use client";

import AdminGate from "@/components/AdminGate";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type User = {
  id: number;
  name?: string;
  email?: string;
  role?: "admin" | "user";
  is_admin?: boolean;
  created_at?: string;
};

export default function AdminUsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 20;

  async function load(p = page) {
    setLoading(true);
    setErr(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const res = await fetch(`${base}/admin/users?page=${p}&pageSize=${pageSize}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });

      if (!res.ok) {
        // Mensajes más específicos
        if (res.status === 401) throw new Error("No autenticado. Inicia sesión.");
        if (res.status === 403) throw new Error("No autorizado. Requiere rol admin.");
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Error ${res.status}`);
      }

      const data = await res.json();
      // Tu backend devuelve { page, pageSize, users: [...] }
      const arr: User[] = data?.users ?? [];
      setItems(Array.isArray(arr) ? arr : []);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo cargar usuarios");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canPrev = page > 1;
  const canNext = items.length === pageSize; // si vienen 20, asumimos hay otra página

  async function setRole(id: number, makeAdmin: boolean) {
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${base}/admin/users/${id}/role`, {
        method: "PATCH", // tu backend usa PATCH
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: makeAdmin ? "admin" : "user" }),
      
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "No se pudo actualizar el rol");
      }
      toast.success(makeAdmin ? "Usuario ahora es admin" : "Rol admin removido");
      await load(page);
    } catch (e: any) {
      toast.error(e?.message || "Error al actualizar rol");
    }
  }

  return (
    <AdminGate>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Usuarios</h1>

          <div className="flex gap-2">
            <button
              className="px-3 py-1 rounded border disabled:opacity-50"
              disabled={!canPrev}
              onClick={() => {
                const p = page - 1;
                setPage(p);
                load(p);
              }}
            >
              ← Anterior
            </button>
            <button
              className="px-3 py-1 rounded border disabled:opacity-50"
              disabled={!canNext}
              onClick={() => {
                const p = page + 1;
                setPage(p);
                load(p);
              }}
            >
              Siguiente →
            </button>
          </div>
        </div>

        {loading ? (
          <p>Cargando…</p>
        ) : err ? (
          <p className="text-red-600 text-sm">{err}</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-[900px] w-full border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 border text-left">ID</th>
                  <th className="p-2 border text-left">Nombre</th>
                  <th className="p-2 border text-left">Email</th>
                  <th className="p-2 border text-left">Rol</th>
                  <th className="p-2 border text-left">Creado</th>
                  <th className="p-2 border text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => {
                  const role = u.role ?? (u.is_admin ? "admin" : "user");
                  return (
                    <tr key={u.id} className="border-t">
                      <td className="p-2 border">{u.id}</td>
                      <td className="p-2 border">{u.name ?? "—"}</td>
                      <td className="p-2 border">{u.email ?? "—"}</td>
                      <td className="p-2 border">{role}</td>
                      <td className="p-2 border">
                        {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}
                      </td>
                      <td className="p-2 border">
                        {role === "admin" ? (
                          <button
                            onClick={() => setRole(u.id, false)}
                            className="text-sm underline"
                          >
                            Quitar admin
                          </button>
                        ) : (
                          <button
                            onClick={() => setRole(u.id, true)}
                            className="text-sm underline"
                          >
                            Hacer admin
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-500">
                      Sin usuarios
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
