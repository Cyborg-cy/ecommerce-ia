"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function Filters() {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState("");
  const [min, setMin] = useState<string>("");
  const [max, setMax] = useState<string>("");

  // precargar filtros desde la URL
  useEffect(() => {
    setQ(sp.get("q") ?? "");
    setMin(sp.get("min") ?? "");
    setMax(sp.get("max") ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apply = () => {
    const params = new URLSearchParams(sp.toString());
    q ? params.set("q", q) : params.delete("q");
    min ? params.set("min", min) : params.delete("min");
    max ? params.set("max", max) : params.delete("max");
    router.push(`/products?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2 items-end">
      <div className="flex flex-col">
        <label className="text-sm">Buscar</label>
        <input
          className="border rounded px-2 py-1"
          placeholder="Nombre..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="flex flex-col">
        <label className="text-sm">Min $</label>
        <input
          className="border rounded px-2 py-1"
          type="number"
          value={min}
          onChange={(e) => setMin(e.target.value)}
        />
      </div>
      <div className="flex flex-col">
        <label className="text-sm">Max $</label>
        <input
          className="border rounded px-2 py-1"
          type="number"
          value={max}
          onChange={(e) => setMax(e.target.value)}
        />
      </div>
      <button
        className="bg-black text-white px-3 py-2 rounded"
        onClick={apply}
      >
        Aplicar
      </button>
    </div>
  );
}
