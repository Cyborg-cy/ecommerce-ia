// app/page.tsx
import Link from "next/link";
import ProductCard from "@/components/ProductCard";

// Evita prerender estático que tronaba con fetch dinámico
export const dynamic = "force-dynamic";

type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  category_name?: string | null;
};

// ⚠️ Lee la base de la API desde env (NO uses localhost en producción)
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3000";

async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_BASE}/products`, { cache: "no-store" });
    if (!res.ok) throw new Error(`API /products respondió ${res.status}`);
    const data = await res.json();

    // Ajusta según tu backend
    if (Array.isArray(data)) return data;            // caso: array directo
    if (Array.isArray(data.items)) return data.items; // caso: { items, meta }
    console.error("Formato inesperado de /products:", data);
    return [];
  } catch (e) {
    console.error("Home getProducts error:", e);
    return [];
  }
}

export default async function HomePage() {
  // ⬇️ AHORA SÍ: define 'products' y úsalo abajo
  const products = await getProducts();

  return (
    <main>
      {/* Hero */}
      <section className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-lg">
            <p className="text-sm text-accent font-medium mb-3">VENTA LETAL</p>
            <h1 className="font-serif text-4xl md:text-5xl leading-[1.1] mb-5">
              Herramientas buenas, elegidas con cuidado.
            </h1>
            <p className="text-muted text-lg mb-8 max-w-md">
              Productos seleccionados, precios claros y resolucion de problemas.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-md px-5 py-3 bg-foreground text-background text-sm font-medium hover:opacity-90"
            >
              Ver productos
            </Link>
          </div>
        </div>
      </section>

      {/* Destacados */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <h2 className="font-serif text-2xl">Destacados</h2>
          <Link href="/products" className="text-sm text-muted hover:text-foreground transition-colors">
            Ver todo
          </Link>
        </div>
        {products.length === 0 ? (
          <p className="text-muted">No hay productos para mostrar.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {products.slice(0, 6).map((p: Product) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
