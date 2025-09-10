"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
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
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Mis pedidos</h1>

        {loading ? (
          <p>Cargando…</p>
        ) : orders.length === 0 ? (
          <p>No tienes pedidos aún.</p>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id} className="border rounded p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">Pedido #{o.id}</div>
                  <div className="text-sm text-gray-500">
                    Fecha: {new Date(o.created_at).toLocaleString()}
                  </div>
                  <div className="text-sm">
                    Estado: <span className="font-medium">{o.status ?? "pendiente"}</span>
                    {" · "}
                    Pago: <span className="font-medium">{o.payment_status ?? "desconocido"}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">
                    Total: $
                    {typeof o.total === "string" ? o.total : o.total.toFixed(2)}
                  </div>
                  <Link
                    href={`/account/orders/${o.id}`}
                    className="inline-block mt-2 px-3 py-1 border rounded hover:bg-gray-50"
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
