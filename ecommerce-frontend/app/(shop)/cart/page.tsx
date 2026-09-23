"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

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
        toast.error("Debes iniciar sesión");
        r.push("/login");
        return;
      }
      toast.error(e?.response?.data?.error || "Error al cargar carrito");
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
      toast.error(e?.response?.data?.error || "No se pudo actualizar");
    }
  }

  async function removeItem(productId: number) {
    try {
      await api.delete(`/cart/item/${productId}`);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "No se pudo eliminar");
    }
  }

  function goCheckout() {
    r.push("/checkout");
  }

  if (!token) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-muted">
          Debes{" "}
          <Link href="/login" className="text-accent hover:underline">
            iniciar sesión
          </Link>{" "}
          para ver tu carrito.
        </p>
      </div>
    );
  }

  if (loading) return <div className="max-w-2xl mx-auto px-6 py-16 text-muted">Cargando...</div>;

  if (!data || data.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center space-y-4">
        <p className="text-muted">Tu carrito está vacío.</p>
        <Link href="/products" className="text-accent hover:underline text-sm">
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl mb-6">Tu carrito</h1>
      <ul className="divide-y divide-border border-y border-border">
        {data.items.map((it) => (
          <li key={it.product_id} className="py-4 flex items-center justify-between gap-4">
            <div>
              <div className="font-medium">{it.name}</div>
              <div className="text-sm text-muted mt-0.5">
                ${Number(it.price).toFixed(2)} c/u
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-border rounded-md">
                <button
                  className="w-8 h-8 hover:bg-background text-sm"
                  onClick={() => changeQty(it.product_id, Math.max(1, it.quantity - 1))}
                >
                  −
                </button>
                <span className="w-8 text-center text-sm">{it.quantity}</span>
                <button
                  className="w-8 h-8 hover:bg-background text-sm"
                  onClick={() => changeQty(it.product_id, it.quantity + 1)}
                >
                  +
                </button>
              </div>
              <button
                className="text-sm text-muted hover:text-red-600 transition-colors"
                onClick={() => removeItem(it.product_id)}
              >
                Quitar
              </button>
              <div className="w-20 text-right font-medium">
                ${Number(it.subtotal).toFixed(2)}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between mt-6">
        <span className="text-muted">Total</span>
        <span className="font-serif text-2xl">${Number(data.total).toFixed(2)}</span>
      </div>

      <button
        onClick={goCheckout}
        className="w-full mt-6 rounded-md px-4 py-3 bg-foreground text-background text-sm font-medium hover:opacity-90"
      >
        Ir a pagar
      </button>
    </div>
  );
}
