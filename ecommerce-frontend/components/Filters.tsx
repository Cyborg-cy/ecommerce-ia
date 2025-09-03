"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";


export default function Filters() {
const sp = useSearchParams();
const router = useRouter();
const [q, setQ] = useState(sp.get("q") ?? "");
const [sort, setSort] = useState(sp.get("sort") ?? "new");


useEffect(() => { setQ(sp.get("q") ?? ""); setSort(sp.get("sort") ?? "new"); }, [sp]);


const apply = () => {
const params = new URLSearchParams(sp.toString());
if (q) params.set("q", q); else params.delete("q");
if (sort) params.set("sort", sort); else params.delete("sort");
params.set("page", "1");
router.push(`/products?${params.toString()}`);
};


return (
<div className="flex flex-wrap gap-2 items-end">
<div>
<label className="block text-xs">Buscar</label>
<input value={q} onChange={(e)=>setQ(e.target.value)} className="border rounded px-3 py-1" placeholder="Nombre o descripción" />
</div>
<div>
<label className="block text-xs">Orden</label>
<select value={sort} onChange={(e)=>setSort(e.target.value)} className="border rounded px-3 py-1">
<option value="new">Nuevos</option>
<option value="price_asc">Precio ↑</option>
<option value="price_desc">Precio ↓</option>
<option value="name_asc">Nombre A-Z</option>
<option value="name_desc">Nombre Z-A</option>
</select>
</div>
<button onClick={apply} className="px-3 py-2 rounded bg-black text-white">Aplicar</button>
</div>
);
}