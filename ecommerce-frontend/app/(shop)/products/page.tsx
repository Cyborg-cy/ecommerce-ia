// app/(shop)/products/page.tsx
import { api } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import Filters from "@/app/(shop)/products/Filters";
import Pagination from "@/app/(shop)/products/Pagination";

type SP = Record<string, string | string[] | undefined>;

async function fetchProducts(params: URLSearchParams) {
  const { data } = await api.get("/products", {
    params: Object.fromEntries(params),
  });

  // Si tu backend devuelve un array simple, lo adaptamos:
  if (Array.isArray(data)) {
    return {
      items: data,
      meta: { page: 1, totalPages: 1 },
    };
  }

  // Si en el futuro devuelves { items, meta }, lo dejamos tal cual:
  return data;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams; // 👈 IMPORTANTE en Next 15
  const usp = new URLSearchParams();

  for (const [k, v] of Object.entries(sp ?? {})) {
    if (!v) continue;
    usp.set(k, Array.isArray(v) ? v[0] : v);
  }

  const data = await fetchProducts(usp);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Productos</h1>
      <Filters />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {data.items.map((p: any) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
      <Pagination page={data.meta.page} totalPages={data.meta.totalPages} />
    </div>
  );
}

// Evita problemas de caché/SSG con filtros dinámicos
export const dynamic = "force-dynamic";
