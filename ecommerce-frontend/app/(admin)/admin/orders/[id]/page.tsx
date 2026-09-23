"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Order = {
  id: number;
  user_id: number;
  status: string;
  payment_status?: string | null;
  total?: number | null;
  created_at?: string;
  updated_at?: string;
  email?: string;
  shipping_name?: string | null;
  shipping_phone?: string | null;
  shipping_address?: string | null;
  shipping_city?: string | null;
  shipping_zip?: string | null;
};

type Item = {
  id: number;
  product_id: number;
  name: string;
  image_url?: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
};

// Espejo de services/orderStatus.js en el backend.
const ALLOWED_NEXT: Record<string, string[]> = {
  pending: ["cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["cancelled"],
  cancelled: [],
};

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const r = useRouter();
  const oid = Number.parseInt(String(id ?? ""), 10);

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const DEFAULT_API = "http://localhost:3000";
  const RAW_BASE =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_API;
  const base = RAW_BASE.includes("localhost:3001") ? DEFAULT_API : RAW_BASE;

  useEffect(() => {
    if (!Number.isInteger(oid) || oid <= 0) {
      toast.error("ID inválido");
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token") || "";
        const res = await fetch(`${base}/admin/orders/${oid}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`GET /admin/orders/${oid} → ${res.status} ${t || ""}`);
        }
        const data = await res.json();
        if (!alive) return;
        setOrder(data.order);
        setItems(data.items || []);
      } catch (e: any) {
        toast.error(e?.message || "No se pudo cargar el pedido");
      } finally {
        alive && setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [oid, base]);

  async function changeStatus(newStatus: string) {
    if (!order) return;
    try {
      setUpdating(true);
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${base}/admin/orders/${order.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `PUT /admin/orders/${order.id}/status → ${res.status}`);
      }
      const updated = await res.json();
      setOrder({ ...order, status: updated.status, payment_status: updated.payment_status });
      toast.success(
        updated.payment_status === "refunded"
          ? `Pedido cancelado y reembolsado en Stripe`
          : `Estado → ${newStatus}`
      );
    } catch (e: any) {
      toast.error(e?.message || "No se pudo actualizar el estado");
    } finally {
      setUpdating(false);
    }
  }

  async function deleteOrder(force = false) {
    if (!order) return;
    if (!force && !confirm(`¿Eliminar el pedido #${order.id}? Esta acción no se puede deshacer.`)) return;
    try {
      setUpdating(true);
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${base}/orders/${order.id}${force ? "?force=true" : ""}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409 && data?.canForce) {
        setUpdating(false);
        if (
          confirm(
            `${data.error}\n\nEsto NO reembolsa en Stripe — es para limpiar datos de prueba. ¿Borrar de todas formas?`
          )
        ) {
          return deleteOrder(true);
        }
        return;
      }
      if (!res.ok) {
        throw new Error(data?.error || `DELETE /orders/${order.id} → ${res.status}`);
      }
      toast.success(data?.forced ? "Pedido eliminado (sin reembolso)" : "Pedido eliminado");
      r.push("/admin/orders");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo eliminar el pedido");
    } finally {
      setUpdating(false);
    }
  }

  const fmt = (n?: number | null) =>
    n == null ? "—" : `$${Number(n).toFixed(2)}`;

  if (loading) return <div className="text-muted">Cargando…</div>;
  if (!order) return <div className="text-muted">Pedido no encontrado</div>;

  return (
    <div className="space-y-6">
      <a href="/admin/orders" className="text-sm text-muted hover:text-foreground transition-colors">← Volver</a>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-serif text-2xl">Pedido #{order.id}</h1>
        <div className="flex items-center gap-3">
          <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-accent/10 text-accent">
            {order.status}
          </span>
          {order.payment_status && (
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                order.payment_status === "paid"
                  ? "bg-green-600/10 text-green-700"
                  : order.payment_status === "refunded"
                  ? "bg-muted/15 text-muted"
                  : "bg-amber-500/10 text-amber-700"
              }`}
            >
              pago: {order.payment_status}
            </span>
          )}
          <select
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm focus:border-accent"
            disabled={updating}
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) changeStatus(v);
              e.currentTarget.value = "";
            }}
          >
            <option value="">Cambiar a…</option>
            {(ALLOWED_NEXT[order.status] || []).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={() => deleteOrder(false)}
            disabled={updating}
            className="text-sm text-red-600 hover:underline disabled:opacity-50"
          >
            Eliminar
          </button>
        </div>
      </div>

      {/* Cabecera */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs text-muted uppercase tracking-wide">Usuario</div>
          <div className="font-medium mt-1">{order.email ?? "—"}</div>
          <div className="text-xs text-muted uppercase tracking-wide mt-3">Fecha</div>
          <div className="mt-1">{order.created_at ? new Date(order.created_at).toLocaleString() : "—"}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 md:col-span-2">
          <div className="text-xs text-muted uppercase tracking-wide">Envío</div>
          <div className="mt-1">
            <div className="font-medium">{order.shipping_name || "—"}</div>
            <div className="text-sm text-muted">
              {order.shipping_address || "—"}{order.shipping_city ? `, ${order.shipping_city}` : ""}
              {order.shipping_zip ? `, ${order.shipping_zip}` : ""}
            </div>
            <div className="text-sm text-muted">{order.shipping_phone || "—"}</div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="overflow-auto rounded-lg border border-border bg-surface">
        <table className="min-w-[800px] w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Unidad</th>
              <th className="px-4 py-3 font-medium">Cantidad</th>
              <th className="px-4 py-3 font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map(it => (
              <tr key={it.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-md border border-border bg-background overflow-hidden flex items-center justify-center shrink-0">
                      {it.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-muted">Sin img</span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{it.name}</div>
                      <div className="text-xs text-muted">ID: {it.product_id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{fmt(it.unit_price)}</td>
                <td className="px-4 py-3">{it.quantity}</td>
                <td className="px-4 py-3 font-medium">{fmt(it.line_total)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">Sin items</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Total */}
      <div className="flex justify-end">
        <div className="rounded-lg border border-border bg-surface p-4 w-full sm:w-80">
          <div className="flex justify-between text-sm text-muted">
            <span>Subtotal</span>
            <span>{fmt(items.reduce((s, it) => s + (it.line_total || 0), 0))}</span>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-muted">Total</span>
            <span className="font-serif text-xl">{fmt(order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
