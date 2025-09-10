// app/(shop)/products/page.tsx
import ProductCard from "@/components/ProductCard";
import Filters from "./Filters";
import Pagination from "./Pagination";

type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  stock?: number | null;
  category_id?: number | null;
  category_name?: string | null;
};

const PAGE_SIZE = 9;

async function getProducts(
  sp: URLSearchParams
): Promise<Product[]> {
  const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

  // Pasamos los mismos filtros al backend por si en un futuro haces filtro/paginación real
  const url = sp.toString()
    ? `${base}/products?${sp.toString()}`
    : `${base}/products`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    console.error("API /products respondió", res.status);
    return [];
  }
  const data = await res.json();
  // Soporta array directo o {items, meta}
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  console.error("Formato inesperado de /products:", data);
  return [];
}

function applyClientFilters(items: Product[], sp: URLSearchParams) {
  const q = (sp.get("q") || "").toLowerCase().trim();
  const category = sp.get("category") || "";
  const min = Number(sp.get("min") || "");
  const max = Number(sp.get("max") || "");

  return items.filter((p) => {
    const name = (p.name || "").toLowerCase();
    const desc = (p.description || "").toLowerCase();
    const price = Number(p.price);

    if (q && !name.includes(q) && !desc.includes(q)) return false;
    if (category && String(p.category_id ?? "") !== category) return false;
    if (!Number.isNaN(min) && min > 0 && price < min) return false;
    if (!Number.isNaN(max) && max > 0 && price > max) return false;
    return true;
  });
}

export default async function ProductsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // ⚠️ Next 15: hay que hacer await a searchParams
  const raw = await props.searchParams;

  // Normalizamos a URLSearchParams (tomando solo el primer valor de cada key)
  const sp = new URLSearchParams(
    Object.entries(raw || {}).reduce((acc, [k, v]) => {
      acc[k] = Array.isArray(v) ? v[0] : (v ?? "");
      return acc;
    }, {} as Record<string, string>)
  );

  // Página actual (cliente)
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));

  // 1) Traer todo (o lo filtrado por backend si algún día lo implementas)
  const all = await getProducts(sp);

  // 2) Aplicar filtros del lado del cliente (texto, categoría, precio)
  const filtered = applyClientFilters(all, sp);

  // 3) Paginación en cliente
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const items = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="p-4">
      <Filters />

      {items.length === 0 ? (
        <div className="text-gray-500 mt-6">
          No se encontraron productos para mostrar.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {items.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} />
    </div>
  );
}

export const dynamic = "force-dynamic";
