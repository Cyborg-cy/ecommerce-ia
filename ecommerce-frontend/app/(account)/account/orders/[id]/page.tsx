"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
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
        r.replace("/account/orders");
        return;
      }
      const { data } = await api.get(`/orders/${orderId}`);
      setOrder(data as Order);
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
              <span>· Pago: <span className="text-foreground">{order.payment_status ?? "desconocido"}</span></span>
              {order.currency && <span>· Moneda: <span className="text-foreground">{order.currency.toUpperCase()}</span></span>}
            </div>

            <h2 className="font-serif text-lg mt-8 mb-2">Productos</h2>
            <ul className="divide-y divide-border border-y border-border">
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
                      <div className="text-sm text-muted">
                        Cantidad: {qty} · ${money(unit)} c/u
                      </div>
                    </div>
                    <div className="font-medium sm:text-right">
                      ${money(subtotal)}
                    </div>
                  </li>
                );
              })}
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
