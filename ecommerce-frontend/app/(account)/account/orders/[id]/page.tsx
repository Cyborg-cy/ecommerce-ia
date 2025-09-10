"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import RequireAuth from "@/components/RequireAuth";

type Item = {
  id?: number;              // puede venir vacío o repetido
  product_id?: number;      // lo usamos como key si está
  name: string;
  quantity: number;
  price: number | string;
};

type Order = {
  id: number;
  total: number | string | null;
  status: string | null;
  created_at: string;
  payment_status?: string | null;
  stripe_payment_intent_id?: string | null;
  currency?: string | null;
  items?: Item[];
};

function money(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const r = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const orderId = params?.id;
      if (!orderId) {
        r.replace("/orders");
        return;
      }
      const { data } = await api.get(`/orders/${orderId}`);
      setOrder(data as Order);
    } catch (e) {
      console.error(e);
      r.replace("/orders");
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
      <div className="p-6 space-y-4">
        <Link href="/orders" className="underline">← Volver</Link>
        <h1 className="text-2xl font-bold">Pedido #{params?.id}</h1>

        {loading ? (
          <p>Cargando…</p>
        ) : !order ? (
          <p>No se encontró el pedido.</p>
        ) : (
          <>
            <div className="text-sm text-gray-600">
              Fecha: {order.created_at ? new Date(order.created_at).toLocaleString() : "-"}
            </div>
            <div className="space-x-2">
              <span>Estado: <b>{order.status ?? "pendiente"}</b></span>
              <span>· Pago: <b>{order.payment_status ?? "desconocido"}</b></span>
              {order.currency && <span>· Moneda: <b>{order.currency.toUpperCase()}</b></span>}
              {order.stripe_payment_intent_id && (
                <span>· PI: <code className="text-xs">{order.stripe_payment_intent_id}</code></span>
              )}
            </div>

            <h2 className="text-lg font-semibold mt-4">Productos</h2>
            <ul className="divide-y">
              {(order.items ?? []).map((it, idx) => {
                const priceNum =
                  typeof it.price === "string" ? parseFloat(it.price) : Number(it.price);
                const unit = Number.isFinite(priceNum) ? priceNum : 0;
                const qty = Number(it.quantity || 0);
                const subtotal = unit * qty;

                // ✅ key robusta: usa product_id si existe; si no, combina id/idx
                const key = it.product_id != null
                  ? `prod-${it.product_id}`
                  : `row-${it.id ?? "noid"}-${idx}`;

                return (
                  <li key={key} className="py-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium">{it.name}</div>
                      <div className="text-xs text-gray-500">
                        {it.product_id ? `#${it.product_id}` : (it.id ? `item:${it.id}` : "item")}
                      </div>
                      <div className="text-sm text-gray-600">
                        Cantidad: <b>{qty}</b> · Precio unitario: <b>${money(unit)}</b>
                      </div>
                    </div>
                    <div className="font-semibold sm:text-right">
                      Subtotal: ${money(subtotal)}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="text-right text-xl font-bold mt-4">
              Total: ${money(order.total)}
            </div>
          </>
        )}
      </div>
    </RequireAuth>
  );
}
