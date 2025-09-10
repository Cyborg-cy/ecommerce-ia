"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import RequireAdmin from "@/components/RequireAdmin";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Product = {
  id: number;
  name: string;
  price: number | string;
  stock: number | null;
  category_name?: string | null;
};

export default function AdminProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const r = useRouter();

  async function load() {
    try {
      const { data } = await api.get("/products");
      setItems(Array.isArray(data) ? data : data.items ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <RequireAdmin>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Productos</h1>
          <Link href="/admin/products/new" className="px-3 py-2 rounded bg-black text-white">
            Nuevo producto
          </Link>
        </div>

        {loading ? (
          <p>Cargando…</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-[600px] w-full border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 border">ID</th>
                  <th className="text-left p-2 border">Nombre</th>
                  <th className="text-left p-2 border">Precio</th>
                  <th className="text-left p-2 border">Stock</th>
                  <th className="text-left p-2 border">Categoría</th>
                  <th className="text-left p-2 border">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2 border">{p.id}</td>
                    <td className="p-2 border">{p.name}</td>
                    <td className="p-2 border">${typeof p.price === "string" ? p.price : p.price?.toFixed(2)}</td>
                    <td className="p-2 border">{p.stock ?? 0}</td>
                    <td className="p-2 border">{p.category_name ?? "-"}</td>
                    <td className="p-2 border space-x-2">
                      <Link href={`/admin/products/${p.id}`} className="underline">Editar</Link>
                      {/* Eliminar rápido */}
                      <button
                        className="text-red-600 underline"
                        onClick={async () => {
                          if (!confirm("¿Eliminar producto?")) return;
                          try {
                            await api.delete(`/products/${p.id}`);
                            await load();
                          } catch (e: any) {
                            alert(e?.response?.data?.error || "No se pudo eliminar");
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={6} className="p-4 text-center text-gray-500">Sin productos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RequireAdmin>
  );
}
