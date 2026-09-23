"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted/15 text-muted",
  paid: "bg-accent/10 text-accent",
  shipped: "bg-green-600/10 text-green-700",
  cancelled: "bg-red-600/10 text-red-600",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] || "bg-muted/15 text-muted"}`}>
      {status}
    </span>
  );
}

type Order = {
  id: number;
  user_id: number;
  status: string;
  payment_status?: string | null;
  total?: number | string | null;
  created_at?: string;
  email?: string;
};

const PAYMENT_STYLES: Record<string, string> = {
  paid: "bg-green-600/10 text-green-700",
  refunded: "bg-muted/15 text-muted",
  unpaid: "bg-amber-500/10 text-amber-700",
};

function PaymentBadge({ paymentStatus }: { paymentStatus?: string | null }) {
  if (!paymentStatus) return <span className="text-muted">—</span>;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_STYLES[paymentStatus] || "bg-muted/15 text-muted"}`}>
      {paymentStatus}
    </span>
  );
}

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
      const updated = await res.json();

      // refresh parcial
      setItems((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: updated.status, payment_status: updated.payment_status } : o))
      );
      toast.success(
        updated.payment_status === "refunded"
          ? `Pedido #${id} cancelado y reembolsado en Stripe`
          : `Pedido #${id} → ${newStatus}`
      );
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-serif text-2xl">Pedidos</h1>
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-xs text-muted mb-1">Estado</label>
            <select
              className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm focus:border-accent"
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
            <label className="block text-xs text-muted mb-1">Desde</label>
            <input
              type="date"
              className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm focus:border-accent"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              max={to || undefined}
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Hasta</label>
            <input
              type="date"
              className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm focus:border-accent"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              min={from || undefined}
            />
          </div>
          <button
            className="px-3.5 py-1.5 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-hover"
            onClick={load}
            disabled={loading}
          >
            Filtrar
          </button>
          {hasFilters && (
            <button className="px-3.5 py-1.5 rounded-md border border-border text-sm hover:bg-surface" onClick={resetFilters}>
              Limpiar
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-muted">Cargando…</p>
      ) : err ? (
        <p className="text-red-600 text-sm">{err}</p>
      ) : (
        <div className="overflow-auto rounded-lg border border-border bg-surface">
          <table className="min-w-[1000px] w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Pago</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((o) => (
                <tr key={o.id} className="hover:bg-background">
                  <td className="px-4 py-3 text-muted">{o.id}</td>
                  <td className="px-4 py-3">{o.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3">
                    <PaymentBadge paymentStatus={o.payment_status} />
                  </td>
                  <td className="px-4 py-3 font-medium">{fmtMoney(o.total)}</td>
                  <td className="px-4 py-3 text-muted">
                    {o.created_at
                      ? new Date(o.created_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 items-center">
                      <select
                        className="rounded-md border border-border bg-surface px-2 py-1 text-sm focus:border-accent"
                        value=""
                        disabled={updatingId === o.id}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v) updateStatus(o.id, v);
                          e.currentTarget.value = ""; // resetea
                        }}
                      >
                        <option value="">Cambiar a…</option>
                        {STATUSES.filter((s) => s !== o.status).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <Link href={`/admin/orders/${o.id}`} className="text-accent hover:underline">
                        Ver
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No hay pedidos
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
