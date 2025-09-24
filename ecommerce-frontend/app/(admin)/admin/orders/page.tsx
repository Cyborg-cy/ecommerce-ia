"use client";

import AdminGate from "@/components/AdminGate";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

type Order = {
  id: number;
  user_id: number;
  status: string;
  total?: number | string | null;
  created_at?: string;
  email?: string;
};

const STATUSES = ["pending", "paid", "shipped", "cancelled"] as const;

function fmtMoney(v?: number | string | null) {
  if (v == null) return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `$${n.toFixed(2)}`;
}

export default function AdminOrdersPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Filtros
  const [status, setStatus] = useState<string>("");
  const [from, setFrom] = useState<string>(""); // YYYY-MM-DD
  const [to, setTo] = useState<string>("");

  // 👇 nuevo: para deshabilitar selector mientras actualiza un pedido concreto
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // 👇 base URL robusta (corrige si por error llega 3001)
  const DEFAULT_API = "http://localhost:3000";
  const RAW_BASE =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_API;
  const base = RAW_BASE.includes("localhost:3001") ? DEFAULT_API : RAW_BASE;

  const hasFilters = useMemo(() => !!(status || from || to), [status, from, to]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);

      const res = await fetch(`${base}/admin/orders${qs.toString() ? `?${qs}` : ""}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("No autenticado.");
        if (res.status === 403) throw new Error("No autorizado (admin).");
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Error ${res.status}`);
      }

      const arr: Order[] = await res.json();
      setItems(Array.isArray(arr) ? arr : []);
    } catch (e: any) {
      const msg = e?.message || "No se pudieron cargar los pedidos";
      toast.error(msg);
      setErr(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // carga inicial

  // 👇 nuevo: recargar cuando cambien filtros (si prefieres botón, elimina este effect)
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, from, to]);

  async function updateStatus(id: number, newStatus: string) {
    try {
      setUpdatingId(id); // 👈 deshabilita el selector solo para ese pedido
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${base}/admin/orders/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "No se pudo actualizar el estado");
      }

      // refresh parcial
      setItems((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
      );
      toast.success(`Pedido #${id} → ${newStatus}`);
    } catch (e: any) {
      toast.error(e?.message || "Error al actualizar estado");
    } finally {
      setUpdatingId(null);
    }
  }

  function resetFilters() {
    setStatus("");
    setFrom("");
    setTo("");
  }

  return (
    <AdminGate>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs text-gray-500">Estado</label>
              <select
                className="border rounded px-2 py-1"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Todos</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500">Desde</label>
              <input
                type="date"
                className="border rounded px-2 py-1"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                max={to || undefined}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Hasta</label>
              <input
                type="date"
                className="border rounded px-2 py-1"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                min={from || undefined}
              />
            </div>
            {/* Si prefieres filtrar solo al click, deja este botón y elimina el effect de arriba */}
            <button
              className="px-3 py-1 rounded border"
              onClick={load}
              disabled={loading}
            >
              Filtrar
            </button>
            {hasFilters && (
              <button className="px-3 py-1 rounded border" onClick={resetFilters}>
                Limpiar
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p>Cargando…</p>
        ) : err ? (
          <p className="text-red-600 text-sm">{err}</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-[1000px] w-full border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 border text-left">ID</th>
                  <th className="p-2 border text-left">Email</th>
                  <th className="p-2 border text-left">Estado</th>
                  <th className="p-2 border text-left">Total</th>
                  <th className="p-2 border text-left">Fecha</th>
                  <th className="p-2 border text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="p-2 border">{o.id}</td>
                    <td className="p-2 border">{o.email ?? "—"}</td>
                    <td className="p-2 border">
                      <span className="inline-block rounded-full px-2 py-0.5 text-xs border">
                        {o.status}
                      </span>
                    </td>
                    <td className="p-2 border">{fmtMoney(o.total)}</td>
                    <td className="p-2 border">
                      {o.created_at
                        ? new Date(o.created_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="p-2 border">
                      <div className="flex gap-2 items-center">
                        <label className="text-xs text-gray-500">Cambiar a:</label>
                        <select
                          className="border rounded px-2 py-1"
                          value=""
                          disabled={updatingId === o.id}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v) updateStatus(o.id, v);
                            e.currentTarget.value = ""; // resetea
                          }}
                        >
                          <option value="">—</option>
                          {STATUSES.filter((s) => s !== o.status).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <Link href={`/admin/orders/${o.id}`} className="text-sm underline">
                        Ver
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-500">
                      No hay pedidos
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
