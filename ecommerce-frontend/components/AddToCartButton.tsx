// components/AddToCartControls.tsx
"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function AddToCartControls({ productId }:{ productId:number }) {
  const [qty, setQty] = useState(1);
  const r = useRouter();
  const { token } = useAuth();

  async function add() {
    if (!token) { r.push("/login"); return; }
    await api.post("/cart/add", { product_id: productId, quantity: qty });
    alert("Agregado al carrito");
  }
  return (
    <div className="flex gap-2">
      <input type="number" min={1} value={qty} onChange={e=>setQty(Math.max(1,Number(e.target.value||1)))} className="border rounded px-2 py-1 w-20" />
      <button onClick={add} className="px-4 py-2 rounded bg-black text-white">Agregar al carrito</button>
    </div>
  );
}
