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

  // Mantener el estado sincronizado con la URL (incluye sp en deps)
  useEffect(() => {
    setQ(sp.get("q") ?? "");
    setMin(sp.get("min") ?? "");
    setMax(sp.get("max") ?? "");
    setCategory(sp.get("category") ?? "");
  }, [sp]);

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
        <label htmlFor="q" className="text-sm">Buscar</label>
        <input
          id="q"
          className="border rounded px-2 py-1"
          placeholder="Nombre o descripción..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>

      <div className="flex flex-col">
        <label htmlFor="min" className="text-sm">Min $</label>
        <input
          id="min"
          className="border rounded px-2 py-1"
          type="number"
          inputMode="decimal"
          value={min}
          onChange={(e) => setMin(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>

      <div className="flex flex-col">
        <label htmlFor="max" className="text-sm">Max $</label>
        <input
          id="max"
          className="border rounded px-2 py-1"
          type="number"
          inputMode="decimal"
          value={max}
          onChange={(e) => setMax(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>

      {/* Opcional: selector de categoría si usas category_id en los productos */}
      <div className="flex flex-col">
        <label htmlFor="category" className="text-sm">Categoría</label>
        <select
          id="category"
          className="border rounded px-2 py-1"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Todas</option>
          <option value="1">Electrónica</option>
          <option value="2">Hogar</option>
          <option value="3">Ropa</option>
          {/* TODO: si tienes endpoint /categories, puedes mapearlas dinámicamente */}
        </select>
      </div>

      <button
        className="bg-black text-white px-3 py-2 rounded"
        onClick={apply}
      >
        Aplicar
      </button>

      <button
        className="px-3 py-2 rounded border"
        onClick={clearAll}
      >
        Limpiar
      </button>
    </div>
  );
}

