"use client";

import AdminGate from "@/components/AdminGate";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  category_id?: number | null;
  image_url?: string | null;
};

type Category = { id: number; name: string };

export default function AdminEditProductPage() {
  const { id } = useParams<{ id: string }>();
  const r = useRouter();
  const pid = Number.parseInt(String(id ?? ""), 10);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

  const [f, setF] = useState({
    name: "",
    description: "",
    price: "", // usar string para controlar input
    stock: "",
    category_id: "", // "" = sin categoría
    image_url: "",
  });

  const DEFAULT_API = "http://localhost:3000";
  const RAW_BASE =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_API;
  const base = RAW_BASE.includes("localhost:3001") ? DEFAULT_API : RAW_BASE;

  function onChange<K extends keyof typeof f>(k: K, v: string) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  useEffect(() => {
    if (!Number.isInteger(pid) || pid <= 0) {
      setErr("ID inválido");
      setLoading(false);
      return;
    }
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // Cargar producto
        const prodRes = await fetch(`${base}/products/${pid}`, { cache: "no-store" });
        if (prodRes.status === 404) throw new Error("Producto no encontrado");
        if (!prodRes.ok) {
          const txt = await prodRes.text();
          throw new Error(`GET /products/${pid} → ${prodRes.status} ${txt || ""}`);
        }
        const p: Product = await prodRes.json();

        // Cargar categorías para el select (admin)
        const token = localStorage.getItem("token") || "";
        const catRes = await fetch(`${base}/admin/categories`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        });
        if (catRes.ok) {
          const list: Category[] = await catRes.json();
          if (alive) setCats(list ?? []);
        } else {
          // si falla, dejamos el select solo con "Sin categoría"
          if (alive) setCats([]);
        }

        if (alive) {
          setF({
            name: p.name || "",
            description: (p.description ?? "") || "",
            price: String(typeof p.price === "number" ? p.price : Number(p.price ?? 0)),
            stock: String(typeof p.stock === "number" ? p.stock : Number(p.stock ?? 0)),
            category_id: p.category_id ? String(p.category_id) : "",
            image_url: (p.image_url ?? "") || "",
          });
        }
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "No se pudo cargar el producto");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [pid, base]);

  async function save(e: React.FormEvent) {
    e.preventDefault();

    // Validación básica cliente
    if (!f.name.trim()) return toast.error("El nombre es obligatorio");
    const priceNum = Number(f.price);
    const stockNum = Number(f.stock);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return toast.error("Precio inválido (> 0)");
    if (!Number.isInteger(stockNum) || stockNum < 0) return toast.error("Stock inválido (entero ≥ 0)");

    try {
      setSaving(true);
      const token = localStorage.getItem("token") || "";

      const body: any = {
        name: f.name.trim(),
        description: f.description.trim() || null,
        price: priceNum,
        stock: stockNum,
        image_url: f.image_url.trim() || null,
      };
      if (f.category_id) body.category_id = Number(f.category_id); // si está vacío, no lo envíes

      const res = await fetch(`${base}/products/${pid}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`PUT /products/${pid} → ${res.status} ${txt || ""}`);
      }

      toast.success("Producto guardado");
      r.push("/admin/products");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo guardar");
    } finally {
      setSaving(false); // sin texto "Guardando…", solo deshabilitar
    }
  }

  if (loading) {
    return (
      <AdminGate>
        <div className="p-6">Cargando…</div>
      </AdminGate>
    );
  }

  return (
    <AdminGate>
      <div className="p-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Editar producto #{pid}</h1>
          <Link href="/admin/products" className="underline text-sm">← Volver</Link>
        </div>

        {err ? (
          <p className="text-red-600 mt-4">{err}</p>
        ) : (
          <form onSubmit={save} className="space-y-4 mt-6">
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
              >
                <option value="">Sin categoría</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (#{c.id})
                  </option>
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
              {f.image_url.trim() ? (
                <div className="mt-2">
                  <img
                    src={f.image_url}
                    alt="preview"
                    className="max-h-48 rounded border"
                    onError={(ev) => ((ev.currentTarget.style.display = "none"))}
                  />
                </div>
              ) : null}
              <div className="mt-2">
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={() => onChange("image_url", "")}
                >
                  Quitar imagen
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="bg-black text-white rounded px-4 py-2 disabled:opacity-60"
            >
              Guardar
            </button>
          </form>
        )}
      </div>
    </AdminGate>
  );
}