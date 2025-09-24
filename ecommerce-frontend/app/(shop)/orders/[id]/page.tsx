"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Order = {
  id: number;
  status: string;
  total?: number | null;
  created_at?: string;
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

export default function UserOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const oid = Number.parseInt(String(id ?? ""), 10);

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

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
        const res = await fetch(`${base}/orders/${oid}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`GET /orders/${oid} → ${res.status} ${t || ""}`);
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

  const fmt = (n?: number | null) =>
    n == null ? "—" : `$${Number(n).toFixed(2)}`;

  if (loading) return <div className="p-6">Cargando…</div>;
  if (!order) return <div className="p-6">Pedido no encontrado</div>;

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <a href="/orders" className="underline text-sm">← Volver a mis pedidos</a>
      <h1 className="text-2xl font-bold">Pedido #{order.id}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded border p-3">
          <div className="text-xs text-gray-500">Estado</div>
          <div className="font-medium">{order.status}</div>
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

      <div className="overflow-auto">
        <table className="min-w-[800px] w-full border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 border text-left">Producto</th>
              <th className="p-2 border text-left">Unidad</th>
              <th className="p-2 border text-left">Cant.</th>
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

      <div className="flex justify-end">
        <div className="rounded border p-4 w-full sm:w-80">
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{fmt(order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
