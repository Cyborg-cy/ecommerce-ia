import ProductCard from "@/components/ProductCard";
import Filters from "./Filters";
import Pagination from "./Pagination";
import { api } from "@/lib/api";

type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  stock?: number | null;
  category_id?: number | null;
  category_name?: string | null;
};

async function getProducts(
  searchParams: Record<string, string | string[] | undefined>
): Promise<Product[]> {
  const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams || {})) {
    if (!v) continue;
    qs.set(k, Array.isArray(v) ? v[0] : v);
  }
  const url = qs.toString() ? `${base}/products?${qs}` : `${base}/products`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`API /products respondió ${res.status}`);
    const data = await res.json();
    // Soporta ambos formatos: array directo o {items, meta}
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    console.error("Formato inesperado de /products:", data);
    return [];
  } catch (err) {
    console.error("GET /products error:", err);
    return [];
  }
}

async function fetchProducts(
  searchParams: Record<string, string | string[] | undefined>
): Promise<Product[]> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams || {})) {
    if (!v) continue;
    params.set(k, Array.isArray(v) ? v[0] : v);
  }
  const qs = params.toString();
  const url = qs ? `/products?${qs}` : "/products";

  const { data } = await api.get(url);
  return Array.isArray(data) ? data : (data.items ?? []);
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;                 // 👈 await obligatorio
  const products = await fetchProducts(sp);

  const page = 1;
  const totalPages = 1;

  return (
    <div className="p-4">
      <Filters />
      {products.length === 0 ? (
        <div className="text-gray-500 mt-6">
          No se encontraron productos para mostrar.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} />
    </div>
  );
}

export const dynamic = "force-dynamic";