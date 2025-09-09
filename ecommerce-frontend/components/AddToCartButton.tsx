"use client";
import { useState, useTransition } from "react";
import { addToCart } from "@/lib/api";

export default function AddToCartButton({ productId, getQty }: { productId: number; getQty: () => number; }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-2">
      <button
        disabled={pending}
        onClick={() => {
          setMsg(null);
          start(async () => {
            try {
              const q = getQty();
              await addToCart(productId, q);
              setMsg("Producto agregado al carrito ✅");
            } catch (e: any) {
              setMsg(e?.message || "Error al agregar");
            }
          });
        }}
        className="bg-black text-white px-4 py-2 rounded"
      >
        {pending ? "Agregando..." : "Agregar al carrito"}
      </button>
      {msg && <div className="text-sm text-gray-600">{msg}</div>}
    </div>
  );
}