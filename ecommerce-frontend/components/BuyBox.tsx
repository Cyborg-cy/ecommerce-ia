// components/BuyBox.tsx
"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import toast from "react-hot-toast";

export default function BuyBox({ productId, stock }: { productId: number; stock: number }) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const outOfStock = stock <= 0;

  if (outOfStock) {
    return <p className="text-sm text-muted">Agotado</p>;
  }

  async function add() {
    try {
      setLoading(true);
      await api.post("/cart/add", { product_id: productId, quantity: qty });
      toast.success("Producto agregado al carrito");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.error || "No se pudo añadir al carrito");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center border border-border rounded-md bg-surface">
        <button
          type="button"
          aria-label="Quitar uno"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          disabled={qty <= 1}
          className="w-10 h-10 hover:bg-background disabled:opacity-40"
        >
          −
        </button>
        <span className="w-10 text-center text-sm" aria-live="polite">{qty}</span>
        <button
          type="button"
          aria-label="Agregar uno"
          onClick={() => setQty((q) => Math.min(stock, q + 1))}
          disabled={qty >= stock}
          className="w-10 h-10 hover:bg-background disabled:opacity-40"
        >
          +
        </button>
      </div>
      <button
        onClick={add}
        disabled={loading}
        className="rounded-md px-5 py-2.5 bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Añadiendo..." : "Añadir al carrito"}
      </button>
    </div>
  );
}
