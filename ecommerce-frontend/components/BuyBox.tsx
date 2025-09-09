// components/BuyBox.tsx
"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function BuyBox({ productId }: { productId: number }) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  async function add() {
    try {
      setLoading(true);
      await api.post("/cart/add", { product_id: productId, quantity: qty });
      alert("Producto añadido al carrito ✅");
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.error || "Error al añadir al carrito ❌");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        id="qty"
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
        className="border rounded px-2 py-1 w-20"
      />
      <button
        onClick={add}
        disabled={loading}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
      >
        {loading ? "Añadiendo..." : "Añadir al carrito"}
      </button>
    </div>
  );
}
