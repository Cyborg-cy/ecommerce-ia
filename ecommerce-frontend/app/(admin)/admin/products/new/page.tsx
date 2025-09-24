"use client";

import AdminGate from "@/components/AdminGate";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

type Category = { id: number; name: string };

type FormState = {
  name: string;
  description: string;
  price: string;
  stock: string;
  category_id: string; // "" => sin categoría
  image_url: string;   // SIEMPRE string
};

export default function AdminNewProductPage() {
  const r = useRouter();

  // ====== API base robusta (evita 3001) ======
  const DEFAULT_API = "http://localhost:3000";
  const RAW_BASE =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_API;
  const base = RAW_BASE.includes("localhost:3001") ? DEFAULT_API : RAW_BASE;

  // ====== Estado categorías ======
  const [cats, setCats] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  // ====== Form ======
  const [mode, setMode] = useState<"url" | "file">("url");
  const [f, setF] = useState<FormState>({
    name: "",
    description: "",
    price: "",
    stock: "",
    category_id: "",
    image_url: "", // 👈 importantísimo: string vacío por defecto
  });
  const [file, setFile] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ====== Cambiar modo limpia file si vuelves a URL ======
  useEffect(() => {
    if (mode === "url") setFile(null);
  }, [mode]);

  // ====== Subir archivo al backend (/uploads/image) ======
  async function uploadImage(file: File): Promise<string> {
    const token = localStorage.getItem("token") || "";
    const form = new FormData();
    form.append("file", file, file.name); // 👈 incluye filename

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
    return String(data.url || ""); // 👈 devolvemos string sí o sí
  }

  // ====== Cargar categorías ======
  useEffect(() => {
    (async () => {
      try {
        setLoadingCats(true);
        const token = localStorage.getItem("token") || "";
        // Intento admin
        let res = await fetch(`${base}/admin/categories`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        });
        // Fallback público
        if (res.status === 404 || res.status === 403) {
          res = await fetch(`${base}/categories`, { cache: "no-store" });
        }
        if (!res.ok) throw new Error(`No se pudieron cargar categorías (${res.status})`);
        const data: Category[] = await res.json();
        setCats(Array.isArray(data) ? data : []);
      } catch (e: any) {
        toast.error(e?.message || "Error cargando categorías");
        setCats([]);
      } finally {
        setLoadingCats(false);
      }
    })();
  }, [base]);

  // ====== Helpers ======
  function onChange<K extends keyof FormState>(key: K, val: string) {
    // Nunca escribimos undefined en ninguna clave
    setF((prev) => ({ ...prev, [key]: String(val ?? "") }));
  }

  // ====== Submit ======
  async function submit(e: React.FormEvent) {
    e.preventDefault();

    // Validaciones mínimas en cliente
    if (!f.name.trim()) return toast.error("El nombre es obligatorio");
    const priceNum = Number(f.price);
    const stockNum = Number(f.stock);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return toast.error("Precio inválido (> 0)");
    if (!Number.isInteger(stockNum) || stockNum < 0) return toast.error("Stock inválido (entero ≥ 0)");

    try {
      setSaving(true);

      // 1) Resolver image_url final (si sube archivo)
      let finalImageUrl = (f.image_url || "").trim();
      if (mode === "file" && file) {
        try {
          setUploading(true);
          finalImageUrl = await uploadImage(file);
        } finally {
          setUploading(false);
        }
      }

      // 2) Armar payload
      const token = localStorage.getItem("token") || "";
      const payload = {
        name: f.name.trim(),
        description: f.description.trim() || null,
        // Enviar como string para evitar JSON null por NaN; Joi convertirá a número
        price: f.price.trim(),
        stock: f.stock.trim(),
        category_id: f.category_id ? Number(f.category_id) : null, // opcional
        image_url: finalImageUrl || null,                           // URL final
      };
      
      console.log("POST /products payload:", payload);

      // 3) Crear
      const res = await fetch(`${base}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error al crear (${res.status}) ${txt || ""}`.trim());
      }

      toast.success("Producto creado");

      // Limpia el form (todas claves -> string)
      setF({
        name: "",
        description: "",
        price: "",
        stock: "",
        category_id: "",
        image_url: "",
      });
      setFile(null);
      setMode("url");

      // r.push("/admin/products");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo crear el producto");
    } finally {
      setSaving(false);
    }
  }

  // 👇 valor SIEMPRE string para el input URL
  const imageUrlVal: string =
    typeof f.image_url === "string" ? f.image_url : "";

  return (
    <AdminGate>
      <div className="p-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Nuevo producto</h1>
          <Link href="/admin/products" className="underline text-sm">
            ← Volver
          </Link>
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
                required
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
                required
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
              {cats.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name} (#{c.id})
                </option>
              ))}
            </select>
          </div>

          {/* ====== Selector de modo imagen ====== */}
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={mode === "url"}
                onChange={() => setMode("url")}
              />
              Desde URL
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={mode === "file"}
                onChange={() => setMode("file")}
              />
              Subir archivo
            </label>
          </div>

          {mode === "url" ? (
  <div>
    <label className="block text-sm">URL de imagen (opcional)</label>
    <input
      key={`image-url-${mode}`}             // 👈 fuerza remount cuando cambia mode
      type="url"
      className="border rounded px-3 py-2 w-full"
      placeholder="https://…"
      value={typeof f.image_url === "string" ? f.image_url : ""} // 👈 siempre string
      onChange={(e) =>
        setF((prev) => ({
          ...prev,
          image_url: e.target.value ?? "",   // 👈 nunca undefined
        }))
      }
      autoComplete="off"
    />
  </div>
) : (
  <div>
    <label className="block text-sm">Archivo</label>
    <input
      type="file"
      accept="image/*"
      onChange={(e) => setFile(e.target.files?.[0] || null)}
      className="block"
    />
    {file && (
      <p className="text-xs text-gray-500 mt-1">
        {file.name} ({Math.round((file.size / 1024 / 1024) * 100) / 100} MB)
      </p>
    )}
  </div>
)}

          {/* Preview */}
          <div className="mt-2 w-28 h-28 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
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
              <span className="text-xs text-gray-400">Sin imagen</span>
            )}
          </div>

          <button
            type="submit"
            disabled={saving || uploading}
            className="bg-black text-white rounded px-4 py-2 disabled:opacity-60"
          >
            {uploading ? "Subiendo…" : saving ? "Creando…" : "Crear"}
          </button>
        </form>
      </div>
    </AdminGate>
  );
}
