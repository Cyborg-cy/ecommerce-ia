"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, useCallback } from "react";

export default function Filters() {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState("");
  const [min, setMin] = useState<string>("");
  const [max, setMax] = useState<string>("");
  const [category, setCategory] = useState<string>(""); // opcional
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingCats, setLoadingCats] = useState(false);

  // Mantener el estado sincronizado con la URL (incluye sp en deps)
  useEffect(() => {
    setQ(sp.get("q") ?? "");
    setMin(sp.get("min") ?? "");
    setMax(sp.get("max") ?? "");
    setCategory(sp.get("category") ?? "");
  }, [sp]);

  // Cargar categorías desde API pública
  useEffect(() => {
    const base =
      process.env.NEXT_PUBLIC_API_BASE ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:3000";
    (async () => {
      try {
        setLoadingCats(true);
        const res = await fetch(`${base}/categories`, { cache: "no-store" });
        if (!res.ok) throw new Error("No se pudieron cargar categorías");
        const data = await res.json();
        if (Array.isArray(data)) setCategories(data);
        else if (Array.isArray(data?.items)) setCategories(data.items);
        else setCategories([]);
      } catch {
        setCategories([]);
      } finally {
        setLoadingCats(false);
      }
    })();
  }, []);

  // Construir params nuevos
  const buildParams = useCallback(() => {
    const params = new URLSearchParams(sp.toString());

    q.trim() ? params.set("q", q.trim()) : params.delete("q");
    min ? params.set("min", min) : params.delete("min");
    max ? params.set("max", max) : params.delete("max");
    category ? params.set("category", category) : params.delete("category");

    // Reiniciar paginación al filtrar
    params.delete("page");

    return params;
  }, [sp, q, min, max, category]);

  const currentKey = useMemo(() => sp.toString(), [sp]);
  const nextKey = useMemo(() => buildParams().toString(), [buildParams]);

  const apply = () => {
    if (nextKey === currentKey) return; // no empujes si no cambió
    router.push(`/products?${nextKey}`);
  };

  const clearAll = () => {
    const params = new URLSearchParams(sp.toString());
    params.delete("q");
    params.delete("min");
    params.delete("max");
    params.delete("category");
    params.delete("page");
    if (params.toString()) {
      router.push(`/products?${params.toString()}`);
    } else {
      router.push(`/products`);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") apply();
  };

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col">
        <label htmlFor="q" className="text-xs text-muted mb-1">Buscar</label>
        <input
          id="q"
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm focus:border-accent"
          placeholder="Nombre o descripción..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>

      <div className="flex flex-col">
        <label htmlFor="min" className="text-xs text-muted mb-1">Min $</label>
        <input
          id="min"
          className="w-24 rounded-md border border-border bg-surface px-3 py-1.5 text-sm focus:border-accent"
          type="number"
          inputMode="decimal"
          value={min}
          onChange={(e) => setMin(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>

      <div className="flex flex-col">
        <label htmlFor="max" className="text-xs text-muted mb-1">Max $</label>
        <input
          id="max"
          className="w-24 rounded-md border border-border bg-surface px-3 py-1.5 text-sm focus:border-accent"
          type="number"
          inputMode="decimal"
          value={max}
          onChange={(e) => setMax(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>

      {/* Opcional: selector de categoría si usas category_id en los productos */}
      <div className="flex flex-col">
        <label htmlFor="category" className="text-xs text-muted mb-1">Categoría</label>
        <select
          id="category"
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm focus:border-accent"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Todas</option>
          {loadingCats ? (
            <option disabled>Cargando...</option>
          ) : (
            categories.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))
          )}
        </select>
      </div>

      <button
        className="rounded-md px-4 py-1.5 bg-foreground text-background text-sm font-medium hover:opacity-90"
        onClick={apply}
      >
        Aplicar
      </button>

      <button
        className="rounded-md px-4 py-1.5 border border-border text-sm hover:bg-background"
        onClick={clearAll}
      >
        Limpiar
      </button>
    </div>
  );
}

