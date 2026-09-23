// components/BuyBox.tsx
"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import toast from "react-hot-toast";

export default function BuyBox({ productId }: { productId: number }) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

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
    <div className="flex items-center gap-3">
      <input
        id="qty"
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
        className="no-spinner rounded-md border border-border bg-surface px-3 py-2.5 w-20 text-sm text-center focus:border-accent"
      />
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
