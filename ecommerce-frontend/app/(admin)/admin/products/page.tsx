"use client";

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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "No se pudo eliminar");
      }
      toast.success(`Producto #${id} eliminado`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Error al eliminar");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">Productos</h1>
        <Link href="/admin/products/new" className="px-3.5 py-1.5 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-hover">
          Nuevo
        </Link>
      </div>

      {loading ? (
        <p className="text-muted">Cargando…</p>
      ) : err ? (
        <p className="text-red-600 text-sm">{err}</p>
      ) : (
        <div className="overflow-auto rounded-lg border border-border bg-surface">
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Precio</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-background">
                  <td className="px-4 py-3 text-muted">{p.id}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">
                    ${typeof p.price === "number" ? p.price.toFixed(2) : p.price}
                  </td>
                  <td className="px-4 py-3">{p.stock}</td>
                  <td className="px-4 py-3 text-muted">{p.category_id ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${p.id}`} className="text-accent hover:underline mr-4">
                      Editar
                    </Link>
                    <button onClick={() => delProduct(p.id)} className="text-red-600 hover:underline">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    Sin productos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
