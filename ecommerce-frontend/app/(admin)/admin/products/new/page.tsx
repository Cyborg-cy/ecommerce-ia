"use client";

import AdminGate from "@/components/AdminGate";
import { useEffect, useState } from "react"; 
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

type Category = { id: number; name: string };

export default function AdminNewProductPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  const [f, setF] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    category_id: "", // string para poder tener "" (sin categoría)
    image_url: "",
  });
  
  
  const [saving, setSaving] = useState(false);

  const DEFAULT_API = "http://localhost:3000";
  const RAW_BASE =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_API;
  const base = RAW_BASE.includes("localhost:3001") ? DEFAULT_API : RAW_BASE;

  useEffect(() => {
    (async () => {
      try {
        setLoadingCats(true);
        const token = localStorage.getItem("token") || "";
        const res = await fetch(`${base}/admin/categories`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`No se pudieron cargar categorías (${res.status})`);
        const data: Category[] = await res.json();
        setCats(data || []);
      } catch (e: any) {
        toast.error(e?.message || "Error cargando categorías");
        setCats([]);
      } finally {
        setLoadingCats(false);
      }
    })();
  }, [base]);

  function onChange<K extends keyof typeof f>(key: K, val: string) {
    setF(prev => ({ ...prev, [key]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    // Validaciones mínimas en cliente
    if (!f.name.trim()) return toast.error("El nombre es obligatorio");
    const priceNum = Number(f.price);
    const stockNum = Number(f.stock);
    if (!Number.isFinite(priceNum) || priceNum <= 0)  return toast.error("Precio inválido (> 0)");
    if (!Number.isInteger(stockNum) || stockNum < 0)  return toast.error("Stock inválido (entero ≥ 0)");

    try {
      setSaving(true);
      const token = localStorage.getItem("token") || "";
      const body = {
        name: f.name.trim(),
        description: f.description.trim() || null,
        price: priceNum,
        stock: stockNum,
        // "" → null
        category_id: f.category_id ? Number(f.category_id) : null,
        image_url: f.image_url.trim() || null,
      };

      const res = await fetch(`${base}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error al crear (${res.status}) ${txt || ""}`);
      }

      toast.success("Producto creado");
      // Limpia el form
      setF({ name: "", description: "", price: "", stock: "", category_id: "", image_url: "" });
    } catch (e: any) {
      toast.error(e?.message || "No se pudo crear el producto");
    } finally {
      setSaving(false); // botón vuelve a estar habilitado
    }
  }

  return (
    <AdminGate>
      <div className="p-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Nuevo producto</h1>
          <Link href="/admin/products" className="underline text-sm">← Volver</Link>
        </div>

        <form onSubmit={submit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm">Nombre</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={f.name}
              onChange={(e) => onChange("name", e.target.value)}
              required
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm">Descripción (opcional)</label>
            <textarea
              className="border rounded px-3 py-2 w-full"
              value={f.description}
              onChange={(e) => onChange("description", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm">Precio</label>
              <input
                inputMode="decimal"
                className="border rounded px-3 py-2 w-full"
                value={f.price}
                onChange={(e) => {
                  // solo números + punto, sin negativos
                  const v = e.target.value.replace(/[^\d.]/g, "");
                  onChange("price", v);
                }}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm">Stock</label>
              <input
                inputMode="numeric"
                className="border rounded px-3 py-2 w-full"
                value={f.stock}
                onChange={(e) => {
                  // solo enteros ≥ 0
                  const v = e.target.value.replace(/[^\d]/g, "");
                  onChange("stock", v);
                }}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm">Categoría (opcional)</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={f.category_id}
              onChange={(e) => onChange("category_id", e.target.value)}
              disabled={loadingCats}
            >
              <option value="">Sin categoría</option>
              {cats.map(c => (
                <option key={c.id} value={c.id}>{c.name} (#{c.id})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm">Imagen (URL, opcional)</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={f.image_url}
              onChange={(e) => onChange("image_url", e.target.value)}
              placeholder="https://…/imagen.jpg"
              autoComplete="off"
            />
            {f.image_url.trim() && (
              <div className="mt-2">
                {/* preview simple */}
                <img
                  src={f.image_url}
                  alt="preview"
                  className="max-h-40 rounded border"
                  onError={(ev) => ((ev.currentTarget.style.display = "none"))}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-black text-white rounded px-4 py-2 disabled:opacity-60"
          >
            Crear
          </button>
        </form>
      </div>
    </AdminGate>
  );
}