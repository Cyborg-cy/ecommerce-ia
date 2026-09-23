"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Category = { id: number; name: string };
type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  stock: number | string;
  category_id?: number | null;
  image_url?: string | null;
};

export default function AdminEditProductPage() {
  const r = useRouter();
  const { id } = useParams<{ id: string }>();
  const pid = Number.parseInt(String(id ?? ""), 10);

  const DEFAULT_API = "http://localhost:3000";
  const RAW_BASE =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_API;
  const base = RAW_BASE.includes("localhost:3001") ? DEFAULT_API : RAW_BASE;

  const [cats, setCats] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  // Modo imagen
  const [mode, setMode] = useState<"url" | "file">("url");

  // Form controlado
  const [f, setF] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    category_id: "",
    image_url: "",
  });

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (mode === "url") setFile(null);
  }, [mode]);

  function onChange<K extends keyof typeof f>(key: K, val: string) {
    setF((prev) => ({ ...prev, [key]: val }));
  }

  async function uploadImage(file: File): Promise<string> {
    const token = localStorage.getItem("token") || "";
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${base}/uploads/image`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`POST /uploads/image → ${res.status} ${t || ""}`.trim());
    }
    const data = await res.json();
    return data.url as string;
  }

  // Cargar categorías y producto
  useEffect(() => {
    if (!Number.isInteger(pid) || pid <= 0) {
      toast.error("ID inválido");
      setLoading(false);
      return;
    }
    let alive = true;

    (async () => {
      try {
        setLoading(true);

        // categorías
        try {
          setLoadingCats(true);
          const token = localStorage.getItem("token") || "";
          let res = await fetch(`${base}/admin/categories`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            cache: "no-store",
          });
          if (res.status === 404 || res.status === 403) {
            res = await fetch(`${base}/categories`, { cache: "no-store" });
          }
          if (res.ok) {
            const data: Category[] = await res.json();
            if (!alive) return;
            setCats(data || []);
          }
        } finally {
          setLoadingCats(false);
        }

        // producto
        const pr = await fetch(`${base}/products/${pid}`, { cache: "no-store" });
        if (!pr.ok) {
          const txt = await pr.text();
          throw new Error(`No se pudo cargar el producto (${pr.status}) ${txt || ""}`.trim());
        }
        const p: Product = await pr.json();
        if (!alive) return;

        setF({
          name: p.name ?? "",
          description: (p.description as string) ?? "",
          price: String(p.price ?? ""),
          stock: String(p.stock ?? ""),
          category_id: p.category_id ? String(p.category_id) : "",
          image_url: p.image_url ?? "",
        });

        // si ya hay image_url, default a URL; si no, deja URL igual
        setMode("url");
      } catch (e: any) {
        toast.error(e?.message || "Error al cargar");
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

    if (!f.name.trim()) return toast.error("El nombre es obligatorio");
    const priceNum = Number(f.price);
    const stockNum = Number(f.stock);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return toast.error("Precio inválido (> 0)");
    if (!Number.isInteger(stockNum) || stockNum < 0) return toast.error("Stock inválido (entero ≥ 0)");

    try {
      setSaving(true);

      // resolver image_url final
      let finalImageUrl = (f.image_url || "").trim();
      if (mode === "file" && file) {
        try {
          setUploading(true);
          finalImageUrl = await uploadImage(file);
        } finally {
          setUploading(false);
        }
      }

      const token = localStorage.getItem("token") || "";
      const body = {
        name: f.name.trim(),
        description: f.description.trim() || null,
        price: Number(f.price),
        stock: parseInt(f.stock, 10),
        category_id: f.category_id ? Number(f.category_id) : null,
        image_url: finalImageUrl || null,
      };

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
        throw new Error(`Error al guardar (${res.status}) ${txt || ""}`.trim());
      }

      toast.success("Producto actualizado");
      r.push("/admin/products");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-muted">Cargando…</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl">Editar producto #{pid}</h1>
        <Link href="/admin/products" className="text-sm text-muted hover:text-foreground transition-colors">
          ← Volver
        </Link>
      </div>

      <form onSubmit={save} className="space-y-5">
        <div>
          <label className="block text-sm mb-1.5 text-foreground/80">Nombre</label>
          <input
            className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm focus:border-accent"
            value={f.name ?? ""}
            onChange={(e) => onChange("name", e.target.value)}
            required
            autoComplete="off"
          />
        </div>

        <div>
          <label className="block text-sm mb-1.5 text-foreground/80">Descripción (opcional)</label>
          <textarea
            className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm focus:border-accent"
            value={f.description ?? ""}
            onChange={(e) => onChange("description", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1.5 text-foreground/80">Precio</label>
            <input
              inputMode="decimal"
              className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm focus:border-accent"
              value={f.price ?? ""}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d.]/g, "");
                onChange("price", v);
              }}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5 text-foreground/80">Stock</label>
            <input
              inputMode="numeric"
              className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm focus:border-accent"
              value={f.stock ?? ""}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d]/g, "");
                onChange("stock", v);
              }}
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1.5 text-foreground/80">Categoría (opcional)</label>
          <select
            className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm focus:border-accent"
            value={f.category_id ?? ""}
            onChange={(e) => onChange("category_id", e.target.value)}
            disabled={loadingCats}
          >
            <option value="">Sin categoría</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (#{c.id})
              </option>
            ))}
          </select>
        </div>

        {/* Modo imagen */}
        <div className="flex gap-5 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={mode === "url"}
              onChange={() => setMode("url")}
              className="accent-accent"
            />
            Desde URL
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={mode === "file"}
              onChange={() => setMode("file")}
              className="accent-accent"
            />
            Subir archivo
          </label>
        </div>

        {mode === "url" ? (
          <div>
            <label className="block text-sm mb-1.5 text-foreground/80">URL de imagen (opcional)</label>
            <input
              type="url"
              className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm focus:border-accent"
              placeholder="https://…"
              value={f.image_url ?? ""}
              onChange={(e) => setF({ ...f, image_url: e.target.value })}
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm mb-1.5 text-foreground/80">Archivo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block text-sm"
            />
            {file && (
              <p className="text-xs text-muted mt-1">
                {file.name} ({Math.round((file.size / 1024 / 1024) * 100) / 100} MB)
              </p>
            )}
          </div>
        )}

        {/* Preview */}
        <div className="w-28 h-28 rounded-md border border-border bg-background overflow-hidden flex items-center justify-center">
          {mode === "file" && file ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={URL.createObjectURL(file)}
              alt="preview"
              className="w-full h-full object-cover"
            />
          ) : f.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={f.image_url}
              alt="preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs text-muted">Sin imagen</span>
          )}
        </div>

        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-md px-5 py-2.5 bg-accent text-accent-foreground text-sm font-medium hover:bg-accent-hover disabled:opacity-50"
        >
          {uploading ? "Subiendo…" : saving ? "Guardando…" : "Guardar"}
        </button>
      </form>
    </div>
  );
}
