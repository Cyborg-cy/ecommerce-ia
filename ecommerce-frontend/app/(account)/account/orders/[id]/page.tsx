"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import RequireAuth from "@/components/RequireAuth";

// Forma de la respuesta de GET /orders/:id → { order, items }
type Item = {
  id: number;
  product_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type Order = {
  id: number;
  total: number | null;
  status: string | null;
  created_at: string;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_zip: string | null;
};

function money(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const r = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const orderId = params?.id;
      if (!orderId) {
        r.replace("/account/orders");
        return;
      }
      const { data } = await api.get(`/orders/${orderId}`);
      setOrder(data.order as Order);
      setItems((data.items ?? []) as Item[]);
    } catch (e) {
      console.error(e);
      r.replace("/account/orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  return (
    <RequireAuth>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link href="/account/orders" className="text-sm text-muted hover:text-foreground transition-colors">
          ← Volver
        </Link>
        <h1 className="font-serif text-2xl mt-3 mb-4">Pedido #{params?.id}</h1>

        {loading ? (
          <p className="text-muted">Cargando…</p>
        ) : !order ? (
          <p className="text-muted">No se encontró el pedido.</p>
        ) : (
          <>
            <div className="text-sm text-muted">
              {order.created_at ? new Date(order.created_at).toLocaleString() : "-"}
            </div>
            <div className="text-sm text-muted mt-1 space-x-1">
              <span>Estado: <span className="text-foreground">{order.status ?? "pendiente"}</span></span>
            </div>

            <h2 className="font-serif text-lg mt-8 mb-2">Envío</h2>
            <div className="text-sm">
              <div>{order.shipping_name || "—"}</div>
              <div className="text-muted">
                {[order.shipping_address, order.shipping_city, order.shipping_zip].filter(Boolean).join(", ") || "—"}
              </div>
              <div className="text-muted">{order.shipping_phone || "—"}</div>
            </div>

            <h2 className="font-serif text-lg mt-8 mb-2">Productos</h2>
            <ul className="divide-y divide-border border-y border-border">
              {items.map((it) => (
                <li key={it.id} className="py-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">{it.name}</div>
                    <div className="text-sm text-muted">
                      Cantidad: {it.quantity} · ${money(it.unit_price)} c/u
                    </div>
                  </div>
                  <div className="font-medium sm:text-right">
                    ${money(it.line_total)}
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between mt-6">
              <span className="text-muted">Total</span>
              <span className="font-serif text-2xl">${money(order.total)}</span>
            </div>
          </>
        )}
      </div>
    </RequireAuth>
  );
}
