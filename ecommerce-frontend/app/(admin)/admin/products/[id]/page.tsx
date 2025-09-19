"use client";

import AdminGate from "@/components/AdminGate";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";

function sanitizePrice(v: string) {
  let s = v.replace(/[+\-eE]/g, "").replace(",", ".");
  const parts = s.split(".");
  if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
  return s.replace(/[^0-9.]/g, "");
}
function sanitizeInt(v: string) {
  return v.replace(/[^\d]/g, "");
}

type Product = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category_id: number | null;
};

export default function AdminEditProductPage() {
  const r = useRouter();
  const params = useParams<{ id: string }>();
  const pid = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [f, setF] = useState({
    name: "",
    description: "",
    price: "",
    stock: "0",
    category_id: "",
  });

  useEffect(() => {
    if (!Number.isFinite(pid)) {
      setErr("ID inválido");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
        const res = await fetch(`${base}/products/${pid}`, { cache: "no-store" });
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) throw new Error("No se pudo cargar el producto");
        const p: Product = await res.json();
        setF({
          name: p.name ?? "",
          description: p.description ?? "",
          price: String(p.price ?? ""),
          stock: String(p.stock ?? "0"),
          category_id: p.category_id ? String(p.category_id) : "",
        });
      } catch (e: any) {
        setErr(e?.message || "Error al cargar");
      } finally {
        setLoading(false);
      }
    })();
  }, [pid]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const priceNum = Number((f.price || "").replace(",", "."));
    const stockNum = Number.parseInt(f.stock || "0", 10);
    const catNum = f.category_id ? Number.parseInt(f.category_id, 10) : null;

    if (!f.name.trim()) return setErr("El nombre es obligatorio.");
    if (!Number.isFinite(priceNum) || priceNum <= 0)
      return setErr("Precio inválido: debe ser un número > 0.");
    if (!Number.isInteger(stockNum) || stockNum < 0)
      return setErr("Stock inválido: debe ser un entero ≥ 0.");
    if (catNum !== null && (!Number.isInteger(catNum) || catNum <= 0))
      return setErr("Categoría inválida: entero positivo o vacío.");

    try {
      setSaving(true);
      const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${base}/products/${pid}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: f.name,
          description: f.description || null,
          price: priceNum,
          stock: stockNum,
          category_id: catNum,
        }),
      });
      if (res.status === 404) { setNotFound(true); return; }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "No se pudo guardar");
      }
      toast.success("Producto guardado");
r.push("/admin/products");
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminGate>
      <div className="p-6 max-w-xl">
        <a href="/admin/products" className="underline text-sm">← Volver</a>

        {loading ? (
          <div className="mt-4">Cargando…</div>
        ) : notFound ? (
          <div className="mt-4 text-red-600">Producto no encontrado.</div>
        ) : (
          <>
            <h1 className="text-2xl font-bold mt-3">Editar producto #{pid}</h1>

            <form onSubmit={save} className="space-y-4 mt-4">
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
                    type="text"           // 👈 sin flechitas
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    className="border rounded px-3 py-2 w-full"
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
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm">Stock</label>
                  <input
                    type="text"           // 👈 sin flechitas
                    inputMode="numeric"
                    pattern="\d*"
                    className="border rounded px-3 py-2 w-full"
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
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm">Categoría (ID)</label>
                <input
                  type="text"           // 👈 sin flechitas
                  inputMode="numeric"
                  pattern="\d*"
                  className="border rounded px-3 py-2 w-full"
                  value={f.category_id}
                  onChange={(e) => setF({ ...f, category_id: sanitizeInt(e.target.value) })}
                  onPaste={(e) => {
                    e.preventDefault();
                    const s = sanitizeInt(e.clipboardData.getData("text"));
                    setF((x) => ({ ...x, category_id: s }));
                  }}
                  placeholder="Opcional"
                />
              </div>

              {err && <p className="text-red-600 text-sm">{err}</p>}

              <button
                disabled={saving}
                className="bg-black text-white rounded px-4 py-2 disabled:opacity-60"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </form>
          </>
        )}
      </div>
    </AdminGate>
  );
}
