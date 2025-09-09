"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CartItem = {
  product_id: number;
  name: string;
  description?: string | null;
  quantity: number;
  price: number | string;
  subtotal: number | string;
};

type CartData = {
  cart_id: number;
  items: CartItem[];
  total: number | string;
};


export default function CartPage() {
  const { token } = useAuth();
  const [data, setData] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const r = useRouter();

  async function load() {
    try {
      const { data } = await api.get("/cart");
      setData(data);
    } catch (e: any) {
      console.error(e);
      if (e?.response?.status === 401) {
        alert("Debes iniciar sesión");
        r.push("/login");
        return;
      }
      alert(e?.response?.data?.error || "Error al cargar carrito");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function changeQty(productId: number, quantity: number) {
    try {
      await api.put(`/cart/item/${productId}`, { quantity });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || "No se pudo actualizar");
    }
  }

  async function removeItem(productId: number) {
    try {
      await api.delete(`/cart/item/${productId}`);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.error || "No se pudo eliminar");
    }
  }

  function goCheckout() {
    r.push("/checkout");
  }

  if (!token) {
    return (
      <div className="p-6">
        <p>
          Debes <Link href="/login" className="underline">iniciar sesión</Link> para ver tu carrito.
        </p>
      </div>
    );
  }

  if (loading) return <div className="p-6">Cargando...</div>;

  if (!data || data.items.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <p>Tu carrito está vacío.</p>
        <Link href="/products" className="underline">Ver productos</Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Tu carrito</h1>
      <ul className="space-y-3">
        {data.items.map((it) => (
          <li key={it.product_id} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{it.name}</div>
              <div className="text-sm text-gray-500">
                ${Number(it.price).toFixed(2)} c/u
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 border rounded"
                onClick={() => changeQty(it.product_id, Math.max(1, it.quantity - 1))}
              >-</button>
              <span>{it.quantity}</span>
              <button
                className="px-2 py-1 border rounded"
                onClick={() => changeQty(it.product_id, it.quantity + 1)}
              >+</button>
              <button
                className="px-3 py-1 border rounded bg-red-50"
                onClick={() => removeItem(it.product_id)}
              >
                Quitar
              </button>
              <div className="w-24 text-right font-semibold">
                ${Number(it.subtotal).toFixed(2)}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="text-right text-xl font-bold">
        Total: ${Number(data.total).toFixed(2)}
      </div>

      <div className="text-right">
     <button onClick={() => r.push("/checkout")}>Ir a pagar</button>
      </div>
    </div>
  );
}
