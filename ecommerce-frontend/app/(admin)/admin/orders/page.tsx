"use client";

import AdminGate from "@/components/AdminGate";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";


type Order = {
  id: number;
  user_id: number;
  status: string;
  total?: number | string | null;
  created_at?: string;
  email?: string; // viene del join en tu endpoint
};

const STATUSES = ["pending", "paid", "shipped", "cancelled"] as const;

function formatDateInput(d?: Date | null) {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function AdminOrdersPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Filtros
  const [status, setStatus] = useState<string>("");
  const [from, setFrom] = useState<string>(""); // YYYY-MM-DD
  const [to, setTo] = useState<string>("");

  const hasFilters = useMemo(() => !!(status || from || to), [status, from, to]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
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
      toast.error(e?.message || "No se pudieron cargar los pedidos");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateStatus(id: number, newStatus: string) {
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${base}/admin/orders/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(`Pedido #${id} → ${newStatus}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "No se pudo actualizar el estado");
      }
      // refresca solo ese pedido en memoria
      setItems((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
      );
    } catch (e: any) {
      toast.error(e?.message || "Error al actualizar estado");
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
                    <td className="p-2 border">
                      {typeof o.total === "number"
                        ? o.total.toFixed(2)
                        : o.total ?? "—"}
                    </td>
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
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v) updateStatus(o.id, v);
                          }}
                        >
                          <option value="">—</option>
                          {STATUSES.filter((s) => s !== o.status).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
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
