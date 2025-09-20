"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

function sanitizeInt(v: string) {
  return v.replace(/[^\d]/g, "");
}

export default function AddToCart({
  productId,
  stock,
}: {
  productId: number;
  stock: number;
}) {
  const r = useRouter();
  const [qty, setQty] = useState("1");
  const [adding, setAdding] = useState(false);

  async function addToCart() {
    const q = Number.parseInt(qty || "1", 10);
    if (!Number.isInteger(q) || q <= 0) {
      toast.error("Cantidad inválida");
      return;
    }
    if (stock <= 0) {
      toast.error("Sin stock");
      return;
    }

    try {
      setAdding(true);
      const base =
        process.env.NEXT_PUBLIC_API_BASE ||
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:3000";
      const token = localStorage.getItem("token") || "";

      // Ajusta la URL si tu backend usa /cart/items
      const res = await fetch(`${base}/cart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ product_id: productId, quantity: q }),
      });

      if (res.status === 401) {
        toast.error("Inicia sesión para agregar al carrito");
        r.push(`/login?next=${encodeURIComponent(`/products/${productId}`)}`);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "No se pudo agregar al carrito");
      }

      toast.success("Agregado al carrito");
    } catch (e: any) {
      toast.error(e?.message || "Error al agregar");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="mt-6 flex items-end gap-3">
      <div>
        <label className="block text-xs text-gray-500">Cantidad</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="\d*"
          className="border rounded px-3 py-2 w-24"
          value={qty}
          onChange={(e) => setQty(sanitizeInt(e.target.value) || "1")}
          onBlur={() => {
            const n = Number.parseInt(qty || "1", 10);
            setQty(String(Number.isFinite(n) && n > 0 ? n : 1));
          }}
        />
      </div>

      <button
        onClick={addToCart}
        disabled={adding || stock <= 0}
        className="bg-black text-white rounded px-4 py-2 disabled:opacity-60"
      >
        {stock <= 0 ? "Sin stock" : adding ? "Agregando…" : "Agregar al carrito"}
      </button>
    </div>
  );
}
