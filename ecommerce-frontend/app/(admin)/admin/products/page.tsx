"use client";

import AdminGate from "@/components/AdminGate";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";



type Product = {
  id: number;
  name: string;
  price: number | string;
  stock: number | string;
  category_id?: number | null;
};

export default function AdminProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

      // Si tienes GET /admin/products (opcional)
      let res = await fetch(`${base}/admin/products`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });

      if (res.status === 404 || res.status === 403) {
        // Fallback a público /products
        res = await fetch(`${base}/products`, { cache: "no-store" });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Error ${res.status}`);
      }

      const data = await res.json();
      const arr: Product[] = Array.isArray(data)
        ? data
        : (data.products ?? data.items ?? data.rows ?? []);
      setItems(arr ?? []);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo cargar productos");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function delProduct(id: number) {
    if (!confirm(`¿Eliminar producto #${id}?`)) return;
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${base}/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`Producto #${id} eliminado`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "No se pudo eliminar");
      }
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Error al eliminar");
    }
  }

  return (
    <AdminGate>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Productos</h1>
          <Link href="/admin/products/new" className="px-3 py-1 rounded bg-black text-white text-sm">
            Nuevo
          </Link>
        </div>

        {loading ? (
          <p>Cargando…</p>
        ) : err ? (
          <p className="text-red-600 text-sm">{err}</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-[900px] w-full border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 border text-left">ID</th>
                  <th className="p-2 border text-left">Nombre</th>
                  <th className="p-2 border text-left">Precio</th>
                  <th className="p-2 border text-left">Stock</th>
                  <th className="p-2 border text-left">Categoría</th>
                  <th className="p-2 border text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2 border">{p.id}</td>
                    <td className="p-2 border">{p.name}</td>
                    <td className="p-2 border">
                      {typeof p.price === "number" ? p.price.toFixed(2) : p.price}
                    </td>
                    <td className="p-2 border">{p.stock}</td>
                    <td className="p-2 border">{p.category_id ?? "—"}</td>
                    <td className="p-2 border">
                      <Link href={`/admin/products/${p.id}`} className="underline text-sm mr-3">
                        Editar
                      </Link>
                      <button onClick={() => delProduct(p.id)} className="text-sm text-red-600 underline">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-500">
                      Sin productos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminGate>
  );
}
