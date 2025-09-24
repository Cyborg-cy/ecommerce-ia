"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type Order = {
  id: number;
  status: string;
  total?: number | string | null;
  created_at?: string;
};

const STATUSES = ["pending", "paid", "shipped", "cancelled"] as const;

function fmtMoney(v?: number | string | null) {
  if (v == null) return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `$${n.toFixed(2)}`;
}

export default function MyOrdersPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Filtros
  const [status, setStatus] = useState<string>("");
  const [from, setFrom] = useState<string>(""); // YYYY-MM-DD
  const [to, setTo] = useState<string>("");

  const hasFilters = useMemo(() => !!(status || from || to), [status, from, to]);

  // base API robusta (evita 3001)
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
      if (!token) {
        setItems([]);
        setErr("Debes iniciar sesión para ver tus pedidos.");
        return;
      }

      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);

      const res = await fetch(`${base}/orders${qs.toString() ? `?${qs}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("No autenticado.");
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Error ${res.status}`);
      }

      const arr: Order[] = await res.json();
      setItems(Array.isArray(arr) ? arr : []);
    } catch (e: any) {
      const msg = e?.message || "No se pudieron cargar tus pedidos";
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
  }, []);

  // Si prefieres auto-filtrar al cambiar filtros, descomenta este effect:
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, from, to]);

  function resetFilters() {
    setStatus("");
    setFrom("");
    setTo("");
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Mis pedidos</h1>
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
                <option key={s} value={s}>{s}</option>
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
          <button className="px-3 py-1 rounded border" onClick={load} disabled={loading}>
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
      ) : items.length === 0 ? (
        <div className="rounded border p-6 text-center text-gray-600">
          Aún no tienes pedidos. <Link href="/products" className="underline">Explorar productos</Link>
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-[800px] w-full border">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 border text-left">ID</th>
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
                  <td className="p-2 border">
                    <span className="inline-block rounded-full px-2 py-0.5 text-xs border">
                      {o.status}
                    </span>
                  </td>
                  <td className="p-2 border">{fmtMoney(o.total)}</td>
                  <td className="p-2 border">
                    {o.created_at ? new Date(o.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="p-2 border">
                    <Link href={`/orders/${o.id}`} className="underline text-sm">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
