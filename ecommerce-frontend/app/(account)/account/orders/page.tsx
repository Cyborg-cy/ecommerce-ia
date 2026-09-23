"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import RequireAuth from "@/components/RequireAuth";

type OrderItem = {
  id: number;
  name: string;
  quantity: number;
  price: number | string;
};

type Order = {
  id: number;
  total: number | string;
  status: string | null;
  created_at: string;
  payment_status?: string | null;
  items?: OrderItem[];
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { data } = await api.get("/orders");
      setOrders(data as Order[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <RequireAuth>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="font-serif text-2xl mb-6">Mis pedidos</h1>

        {loading ? (
          <p className="text-muted">Cargando…</p>
        ) : orders.length === 0 ? (
          <p className="text-muted">No tienes pedidos aún.</p>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li
                key={o.id}
                className="rounded-lg border border-border bg-surface p-4 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="font-medium">Pedido #{o.id}</div>
                  <div className="text-sm text-muted">
                    {new Date(o.created_at).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted">
                    Estado: <span className="text-foreground">{o.status ?? "pendiente"}</span>
                    {" · "}
                    Pago: <span className="text-foreground">{o.payment_status ?? "desconocido"}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-serif text-lg">
                    ${typeof o.total === "string" ? o.total : o.total.toFixed(2)}
                  </div>
                  <Link
                    href={`/account/orders/${o.id}`}
                    className="inline-block mt-2 text-sm text-accent hover:underline"
                  >
                    Ver detalle
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </RequireAuth>
  );
}
