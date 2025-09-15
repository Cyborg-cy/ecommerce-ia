"use client";

import AdminGate from "@/components/AdminGate";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminNewProductPage() {
  const r = useRouter();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    name: "",
    description: "",
    price: "",
    stock: "0",
    category_id: "",
  });

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${base}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: f.name,
          description: f.description || null,
          price: Number(f.price),
          stock: Number(f.stock || "0"),
          category_id: f.category_id ? Number(f.category_id) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "No se pudo crear el producto");
      }
      r.push("/admin/products");
    } catch (err: any) {
      alert(err.message || "Error al crear producto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminGate>
      <div className="p-6 max-w-xl">
        <a href="/admin/products" className="underline text-sm">← Volver</a>
        <h1 className="text-2xl font-bold mt-3">Nuevo producto</h1>

        <form onSubmit={createProduct} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm">Nombre</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm">Descripción</label>
            <textarea
              className="border rounded px-3 py-2 w-full"
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm">Precio</label>
              <input
                type="number"
                step="0.01"
                className="border rounded px-3 py-2 w-full"
                value={f.price}
                onChange={(e) => setF({ ...f, price: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm">Stock</label>
              <input
                type="number"
                className="border rounded px-3 py-2 w-full"
                value={f.stock}
                onChange={(e) => setF({ ...f, stock: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm">Categoría (ID)</label>
            <input
              type="number"
              className="border rounded px-3 py-2 w-full"
              value={f.category_id}
              onChange={(e) => setF({ ...f, category_id: e.target.value })}
              placeholder="Opcional"
            />
          </div>

          <button
            disabled={saving}
            className="bg-black text-white rounded px-4 py-2"
          >
            {saving ? "Guardando…" : "Crear"}
          </button>
        </form>
      </div>
    </AdminGate>
  );
}
