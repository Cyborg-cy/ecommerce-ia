// app/(shop)/products/page.tsx
import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import Filters from "@/app/(shop)/products/Filters";
import Pagination from "@/app/(shop)/products/Pagination";

type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  stock?: number | null;
  category_id?: number | null;
  category_name?: string | null;
};

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
  // Si tu backend devuelve {items, meta}, adapta esto:
  // return data.items as Product[];
  return data as Product[];
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const products = await fetchProducts(searchParams ?? {});
  // Si tienes paginación real del backend, reemplaza estos valores:
  const page = 1;
  const totalPages = 1;

  return (
    <div className="p-4">
      <Filters />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {products.map((p: Product) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} />
    </div>
  );
}