"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import RequireAdmin from "@/components/RequireAdmin";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  stock: number | null;
  category_id: number | null;
};

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const r = useRouter();
  const [p, setP] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { data } = await api.get(`/products/${id}`);
      setP(data);
    } catch (e) {
      console.error(e);
      r.replace("/admin/products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!p) return;
    try {
      await api.put(`/products/${id}`, {
        name: p.name,
        description: p.description,
        price: Number(p.price),
        stock: Number(p.stock ?? 0),
        category_id: Number(p.category_id ?? 1),
      });
      alert("Guardado ✅");
      r.push("/admin/products");
    } catch (e: any) {
      alert(e?.response?.data?.error || "No se pudo guardar");
    }
  }

  if (loading) return <RequireAdmin><div className="p-6">Cargando…</div></RequireAdmin>;
  if (!p) return <RequireAdmin><div className="p-6">Producto no encontrado</div></RequireAdmin>;

  return (
    <RequireAdmin>
      <div className="p-6 space-y-4">
        <Link href="/admin/products" className="underline">← Volver</Link>
        <h1 className="text-2xl font-bold">Editar producto #{id}</h1>

        <form onSubmit={save} className="space-y-3 max-w-md">
          <div>
            <label className="block text-sm">Nombre</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={p.name}
              onChange={(e) => setP({ ...p, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm">Descripción</label>
            <textarea
              className="border rounded px-3 py-2 w-full"
              value={p.description ?? ""}
              onChange={(e) => setP({ ...p, description: e.target.value })}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm">Precio</label>
              <input
                type="number"
                step="0.01"
                className="border rounded px-3 py-2 w-full"
                value={Number(p.price)}
                onChange={(e) => setP({ ...p, price: Number(e.target.value) })}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm">Stock</label>
              <input
                type="number"
                className="border rounded px-3 py-2 w-full"
                value={Number(p.stock ?? 0)}
                onChange={(e) => setP({ ...p, stock: Number(e.target.value) })}
              />
            </div>
          </div>

          <button className="px-4 py-2 rounded bg-black text-white">Guardar</button>
        </form>
      </div>
    </RequireAdmin>
  );
}
