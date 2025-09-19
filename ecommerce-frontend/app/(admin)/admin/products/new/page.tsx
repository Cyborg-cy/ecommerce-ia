"use client";

import AdminGate from "@/components/AdminGate";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

function sanitizePrice(v: string) {
  // Sólo dígitos y UN punto; coma→punto; sin signos
  let s = v.replace(/[+\-eE]/g, "").replace(",", ".");
  const parts = s.split(".");
  if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
  return s.replace(/[^0-9.]/g, "");
}
function sanitizeInt(v: string) {
  return v.replace(/[^\d]/g, ""); // sólo dígitos (enteros)
}

export default function AdminNewProductPage() {
  const r = useRouter();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [f, setF] = useState({
    name: "",
    description: "",
    price: "",       // <— TEXT, sin flechitas
    stock: "0",      // <— TEXT, sólo enteros
    category_id: "", // <— TEXT, sólo enteros
  });

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const priceNum = Number((f.price || "").replace(",", "."));
    const stockNum = Number.parseInt(f.stock || "0", 10);
    const catNum   = f.category_id ? Number.parseInt(f.category_id, 10) : null;

    if (!f.name.trim()) return setErr("El nombre es obligatorio.");
    if (!Number.isFinite(priceNum) || priceNum <= 0)
      return setErr("Precio inválido: debe ser > 0.");
    if (!Number.isInteger(stockNum) || stockNum < 0)
      return setErr("Stock inválido: entero ≥ 0.");
    if (catNum !== null && (!Number.isInteger(catNum) || catNum <= 0))
      return setErr("Categoría inválida: entero positivo o vacío.");

    try {
      setSaving(true);
      const base  = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${base}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: f.name,
          description: f.description || null,
          price: priceNum,
          stock: stockNum,
          category_id: catNum,
        }),
      });
      if (!res.ok) {
  const data = await res.json().catch(() => ({}));
  throw new Error(data?.error || "No se pudo crear el producto");
}
    toast.success("Producto creado");
r.push("/admin/products");
    } catch (e: any) {
  toast.error(e?.message || "Error al crear producto");
  setErr(e?.message || "Error al crear producto");
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
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm">Descripción</label>
            <textarea
              className="border rounded px-3 py-2 w-full"
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm">Precio</label>
              <input
                type="text"                // ← TEXT (no number)
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                className="border rounded px-3 py-2 w-full appearance-none"
                value={f.price}
                onChange={(e) => setF({ ...f, price: sanitizePrice(e.target.value) })}
                onPaste={(e) => {
                  e.preventDefault();
                  const s = sanitizePrice(e.clipboardData.getData("text"));
                  setF((x) => ({ ...x, price: s }));
                }}
                onBlur={() => {
                  const n = Number((f.price || "").replace(",", "."));
                  if (!Number.isFinite(n) || n <= 0) {
                    setF((x) => ({ ...x, price: "0.01" }));
                  } else {
                    setF((x) => ({ ...x, price: String(Number(n.toFixed(2))) }));
                  }
                }}
                placeholder="0.01"
                autoComplete="off"
                required
              />
            </div>
            <div>
              <label className="block text-sm">Stock</label>
              <input
                type="text"                // ← TEXT (no number)
                inputMode="numeric"
                pattern="\d*"
                className="border rounded px-3 py-2 w-full appearance-none"
                value={f.stock}
                onChange={(e) => setF({ ...f, stock: sanitizeInt(e.target.value) })}
                onPaste={(e) => {
                  e.preventDefault();
                  const s = sanitizeInt(e.clipboardData.getData("text"));
                  setF((x) => ({ ...x, stock: s || "0" }));
                }}
                onBlur={() => {
                  const n = Number.parseInt(f.stock || "0", 10);
                  setF((x) => ({ ...x, stock: String(Number.isFinite(n) && n >= 0 ? n : 0) }));
                }}
                placeholder="0"
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm">Categoría (ID)</label>
            <input
              type="text"                // ← TEXT (no number)
              inputMode="numeric"
              pattern="\d*"
              className="border rounded px-3 py-2 w-full appearance-none"
              value={f.category_id}
              onChange={(e) => setF({ ...f, category_id: sanitizeInt(e.target.value) })}
              onPaste={(e) => {
                e.preventDefault();
                const s = sanitizeInt(e.clipboardData.getData("text"));
                setF((x) => ({ ...x, category_id: s }));
              }}
              placeholder="Opcional"
              autoComplete="off"
            />
          </div>

          {err && <p className="text-red-600 text-sm">{err}</p>}

          <button
            disabled={saving}
            className="bg-black text-white rounded px-4 py-2 disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Crear"}
          </button>
        </form>
      </div>
    </AdminGate>
  );
}
