"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";

type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  stock?: number | null;
  category_id?: number | null;
  category_name?: string | null;
};

export default function Recommendations({ productId, limit = 8 }: { productId: number; limit?: number }) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const base =
          process.env.NEXT_PUBLIC_API_BASE ||
          process.env.NEXT_PUBLIC_API_URL ||
          "http://localhost:3000";
        const res = await fetch(`${base}/products/recommendations/${productId}?limit=${limit}`, { cache: "no-store" });
        if (!res.ok) throw new Error("No se pudo cargar recomendaciones");
        const data = await res.json();
        if (alive) setItems(Array.isArray(data) ? data : []);
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [productId, limit]);

  if (loading || items.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-xl font-semibold">Te puede interesar</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-3">
        {items.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}
