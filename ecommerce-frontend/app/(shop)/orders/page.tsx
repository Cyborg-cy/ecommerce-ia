"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type OrderItem = {
  id: number;
  name: string;
  quantity: number;
  price: number | string;
};

type Order = {
  id: number;
  user_id: number;
  total: number | string;
  status: string | null;
  payment_status?: string | null;
  created_at: string;
  items?: OrderItem[];
};

export default function OrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const { data } = await api.get("/orders");
      // Backend devuelve un array de orders con items
      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.message ||
        "No se pudieron cargar los pedidos";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // No logueado
  if (!token) {
    return (
      <div className="p-6">
        <p className="mb-2">Debes iniciar sesión para ver tus pedidos.</p>
        <Link className="underline" href="/login">Ir a iniciar sesión</Link>
      </div>
    );
  }

  // Cargando
  if (loading) return <div className="p-6">Cargando pedidos...</div>;

  // Error
  if (err) {
    return (
      <div className="p-6">
        <p className="text-red-600">Error: {err}</p>
        <button
          onClick={load}
          className="mt-3 px-4 py-2 rounded bg-black text-white"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // Vacío
  if (!orders.length) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">Mis pedidos</h1>
        <p className="text-gray-600">Aún no tienes pedidos.</p>
        <Link href="/products" className="inline-block mt-4 px-4 py-2 rounded bg-black text-white">
          Ver productos
        </Link>
      </div>
    );
  }

  // Listado
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Mis pedidos</h1>

      <ul className="space-y-4">
        {orders.map((o) => {
          const totalNum = Number(o.total ?? 0);
          const created = new Date(o.created_at).toLocaleString();

          return (
            <li key={o.id} className="border rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="space-y-1">
                  <div className="font-semibold">Pedido #{o.id}</div>
                  <div className="text-sm text-gray-500">{created}</div>
                  <div className="text-sm">
                    Estado del pago:{" "}
                    <span className={o.payment_status === "paid" ? "text-green-600" : "text-yellow-700"}>
                      {o.payment_status ?? "unpaid"}
                    </span>
                  </div>
                  <div className="text-sm">
                    Estado del pedido: <span>{o.status ?? "pending"}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold">
                    Total: ${totalNum.toFixed(2)}
                  </div>
                  <Link
                    href="/products"
                    className="inline-block mt-2 px-3 py-1 rounded bg-black text-white"
                  >
                    Comprar de nuevo
                  </Link>
                </div>
              </div>

              {!!o.items?.length && (
                <div className="mt-3 border-t pt-3">
                  <div className="font-medium mb-2">Productos</div>
                  <ul className="space-y-1">
                    {o.items.map((it) => {
                      const priceNum = Number(it.price ?? 0);
                      return (
                        <li key={it.id} className="text-sm flex justify-between">
                          <span>
                            {it.name} × {it.quantity}
                          </span>
                          <span>${priceNum.toFixed(2)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
