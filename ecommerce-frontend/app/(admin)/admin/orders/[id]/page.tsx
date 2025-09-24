"use client";

import AdminGate from "@/components/AdminGate";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Order = {
  id: number;
  user_id: number;
  status: string;
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

const STATUSES = ["pending", "paid", "shipped", "cancelled"] as const;

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
        const t = await res.text();
        throw new Error(`PUT /admin/orders/${order.id}/status → ${res.status} ${t || ""}`);
      }
      setOrder({ ...order, status: newStatus });
      toast.success(`Estado → ${newStatus}`);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo actualizar el estado");
    } finally {
      setUpdating(false);
    }
  }

  const fmt = (n?: number | null) =>
    n == null ? "—" : `$${Number(n).toFixed(2)}`;

  if (loading) return <AdminGate><div className="p-6">Cargando…</div></AdminGate>;
  if (!order) return <AdminGate><div className="p-6">Pedido no encontrado</div></AdminGate>;

  return (
    <AdminGate>
      <div className="p-6 space-y-4">
        <a href="/admin/orders" className="underline text-sm">← Volver</a>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Pedido #{order.id}</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm">Estado:</span>
            <span className="px-2 py-0.5 border rounded-full text-xs">{order.status}</span>
            <select
              className="border rounded px-2 py-1 text-sm"
              disabled={updating}
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                if (v) changeStatus(v);
                e.currentTarget.value = "";
              }}
            >
              <option value="">Cambiar a…</option>
              {STATUSES.filter(s => s !== order.status).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cabecera */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded border p-3">
            <div className="text-xs text-gray-500">Usuario</div>
            <div className="font-medium">{order.email ?? "—"}</div>
            <div className="text-xs text-gray-500 mt-2">Fecha</div>
            <div>{order.created_at ? new Date(order.created_at).toLocaleString() : "—"}</div>
          </div>
          <div className="rounded border p-3 md:col-span-2">
            <div className="text-xs text-gray-500">Envío</div>
            <div className="mt-1">
              <div>{order.shipping_name || "—"}</div>
              <div className="text-sm text-gray-600">
                {order.shipping_address || "—"}{order.shipping_city ? `, ${order.shipping_city}` : ""}
                {order.shipping_zip ? `, ${order.shipping_zip}` : ""}
              </div>
              <div className="text-sm text-gray-600">{order.shipping_phone || "—"}</div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="overflow-auto">
          <table className="min-w-[800px] w-full border">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 border text-left">Producto</th>
                <th className="p-2 border text-left">Unidad</th>
                <th className="p-2 border text-left">Cantidad</th>
                <th className="p-2 border text-left">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id} className="border-t">
                  <td className="p-2 border">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                        {it.image_url ? (
                          <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-gray-400">Sin img</span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{it.name}</div>
                        <div className="text-xs text-gray-500">ID: {it.product_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-2 border">{fmt(it.unit_price)}</td>
                  <td className="p-2 border">{it.quantity}</td>
                  <td className="p-2 border">{fmt(it.line_total)}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">Sin items</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="flex justify-end">
          <div className="rounded border p-4 w-full sm:w-80">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{fmt(items.reduce((s, it) => s + (it.line_total || 0), 0))}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold mt-2">
              <span>Total</span>
              <span>{fmt(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </AdminGate>
  );
}
