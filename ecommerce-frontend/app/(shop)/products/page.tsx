import ProductCard from "@/components/ProductCard";
import Filters from "./Filters";
import Pagination from "@/components/Pagination";

type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  stock?: number | null;
  category_id?: number | null;
  category_name?: string | null;
  image_url?: string | null;
};

type Meta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const PAGE_SIZE = 9;

function applyClientFilters(items: Product[], sp: URLSearchParams) {
  const q = (sp.get("q") || "").toLowerCase().trim();
  const category = sp.get("category") || "";
  const min = Number(sp.get("min") || "");
  const max = Number(sp.get("max") || "");

  return items.filter((p) => {
    const name = (p.name || "").toLowerCase();
    const desc = (p.description || "").toLowerCase();
    const priceNum = Number(p.price);

    if (q && !name.includes(q) && !desc.includes(q)) return false;
    if (category && String(p.category_id ?? "") !== category) return false;
    if (!Number.isNaN(min) && min > 0 && priceNum < min) return false;
    if (!Number.isNaN(max) && max > 0 && priceNum > max) return false;
    return true;
  });
}

function buildSearchQS(sp: URLSearchParams, page: number, pageSize: number) {
  const qs = new URLSearchParams();
  if (sp.get("q")) qs.set("q", sp.get("q")!);
  if (sp.get("category")) qs.set("category_id", sp.get("category")!);
  if (sp.get("min")) qs.set("minPrice", sp.get("min")!);
  if (sp.get("max")) qs.set("maxPrice", sp.get("max")!);
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));
  return qs;
}

export default async function ProductsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await props.searchParams;

  const sp = new URLSearchParams(
    Object.entries(raw || {}).reduce((acc, [k, v]) => {
      acc[k] = Array.isArray(v) ? v[0] : (v ?? "");
      return acc;
    }, {} as Record<string, string>)
  );

  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const pageSize = Math.max(1, parseInt(sp.get("pageSize") || String(PAGE_SIZE), 10));

  const base =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3000";

  let items: Product[] = [];
  let meta: Meta = { page, pageSize, total: 0, totalPages: 1 };

  // Intentar backend con paginación real
  try {
    const qs = buildSearchQS(sp, page, pageSize);
    const res = await fetch(`${base}/products/search?${qs.toString()}`, { cache: "no-store" });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.items) && data?.meta) {
        items = data.items;
        meta = {
          page: Number(data.meta.page ?? page),
          pageSize: Number(data.meta.pageSize ?? pageSize),
          total: Number(data.meta.total ?? 0),
          totalPages: Math.max(1, Number(data.meta.totalPages ?? 1)),
        };
      } else {
        throw new Error("Formato inesperado en /products/search");
      }
    } else if (res.status === 404) {
      throw new Error("Endpoint /products/search no disponible");
    } else {
      throw new Error(`Error ${res.status} en /products/search`);
    }
  } catch {
    // Fallback: GET /products + filtros/paginación en cliente
    const url = sp.toString() ? `${base}/products?${sp.toString()}` : `${base}/products`;
    const res = await fetch(url, { cache: "no-store" });

    if (res.ok) {
      const data = await res.json();
      const all: Product[] = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
        ? data.items
        : [];

      const filtered = applyClientFilters(all, sp);
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      const start = (page - 1) * pageSize;
      items = filtered.slice(start, start + pageSize);
      meta = { page, pageSize, total: filtered.length, totalPages };
    } else {
      items = [];
      meta = { page, pageSize, total: 0, totalPages: 1 };
    }
  }

  // Construir hrefs (strings) para Pagination
  const buildHref = (p: number) => {
    const q2 = new URLSearchParams(sp);
    q2.set("page", String(p));
    q2.set("pageSize", String(pageSize));
    return `/products?${q2.toString()}`;
  };
  const prev = Math.max(meta.page - 1, 1);
  const next = Math.min(meta.page + 1, meta.totalPages);
  const prevHref = buildHref(prev);
  const nextHref = buildHref(next);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl mb-6">Productos</h1>
      <Filters />

      {items.length === 0 ? (
        <div className="text-muted mt-10 text-center">
          No se encontraron productos para mostrar.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mt-8">
          {items.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}

      <Pagination
        page={meta.page}
        totalPages={meta.totalPages}
        prevHref={prevHref}
        nextHref={nextHref}
      />
    </div>
  );
}

export const dynamic = "force-dynamic";
