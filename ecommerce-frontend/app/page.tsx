// app/page.tsx
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import HomeRecommendations from "@/components/HomeRecommendations";

// Evita prerender estático que tronaba con fetch dinámico
export const dynamic = "force-dynamic";

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

type Category = {
  id: number;
  name: string;
  description?: string | null;
};

// ⚠️ Lee la base de la API desde env (NO uses localhost en producción)
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3000";

async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_BASE}/products?limit=8`, { cache: "no-store" });
    if (!res.ok) throw new Error(`API /products respondió ${res.status}`);
    const data = await res.json();

    if (Array.isArray(data)) return data;            // caso: array directo
    if (Array.isArray(data.items)) return data.items; // caso: { items, meta }
    console.error("Formato inesperado de /products:", data);
    return [];
  } catch (e) {
    console.error("Home getProducts error:", e);
    return [];
  }
}

async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE}/categories`, { cache: "no-store" });
    if (!res.ok) throw new Error(`API /categories respondió ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("Home getCategories error:", e);
    return [];
  }
}

function formatPrice(price: number | string) {
  return typeof price === "number" ? price.toFixed(2) : String(price ?? "");
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const perks = [
  {
    title: "Pago seguro",
    text: "Pagas con tarjeta a través de Stripe. No guardamos tus datos de pago.",
    icon: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
  },
  {
    title: "Precios claros",
    text: "Lo que ves es lo que pagas. Sin cargos sorpresa al final.",
    icon: (
      <>
        <path d="M20 12 12 20l-8-8V4h8Z" />
        <circle cx="8.5" cy="8.5" r="1.3" />
      </>
    ),
  },
  {
    title: "Sigue tus pedidos",
    text: "Consulta el estado de cada pedido desde tu cuenta, y cancélalo si aún no está pagado.",
    icon: (
      <>
        <path d="M9 5h11M9 12h11M9 19h11" />
        <path d="m3.5 5 1 1 2-2M3.5 12l1 1 2-2M3.5 19l1 1 2-2" />
      </>
    ),
  },
];

export default async function HomePage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  // Producto de portada: el primero con imagen, o el primero a secas
  const heroProduct = products.find((p) => p.image_url) ?? products[0];
  const secondImage = products.find((p) => p.image_url && p.id !== heroProduct?.id);
  // Imagen representativa por categoría, tomada de los productos cargados
  const categoryImage = (id: number) => products.find((p) => p.category_id === id && p.image_url)?.image_url;

  return (
    <main>
      {/* Hero */}
      <section className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-24 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="flex flex-col gap-5 md:gap-7">
            <p className="text-xs md:text-sm font-semibold tracking-[0.14em] text-accent">TIENDA EN LÍNEA</p>
            <h1 className="font-serif text-4xl md:text-6xl leading-[1.05] font-semibold tracking-tight">
              Herramientas buenas, elegidas con cuidado.
            </h1>
            <p className="text-muted text-base md:text-lg leading-relaxed max-w-md">
              Productos seleccionados, precios claros y un asistente que te ayuda a encontrar lo que de verdad necesitas.
            </p>

            <form action="/products" method="get" className="flex flex-col gap-2.5 md:mt-2">
              <label htmlFor="home-search" className="text-sm font-medium">
                Describe lo que buscas
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:p-1.5 sm:bg-white sm:border sm:border-foreground/20 sm:rounded-xl">
                <div className="flex items-center gap-2.5 h-13 sm:h-auto px-3.5 bg-white border border-foreground/20 rounded-xl sm:border-0 sm:bg-transparent flex-1 text-muted">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  <input
                    id="home-search"
                    name="q"
                    type="search"
                    placeholder="Ej. un taladro ligero para colgar repisas"
                    className="flex-1 min-w-0 bg-transparent outline-none text-base text-[#0f1115] placeholder:text-[#5b6472] py-3"
                  />
                </div>
                <button
                  type="submit"
                  className="h-12 px-5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
                >
                  Buscar
                </button>
              </div>
            </form>

            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categories.slice(0, 3).map((c) => (
                  <Link
                    key={c.id}
                    href={`/products?category=${c.id}`}
                    className="px-3.5 py-2 rounded-full border border-border bg-background text-sm text-foreground/80 hover:text-foreground"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 grid-rows-2 gap-4 h-[240px] md:h-[520px]">
            <Link
              href={heroProduct ? `/products/${heroProduct.id}` : "/products"}
              className="row-span-2 max-md:col-span-2 max-md:row-span-2 relative rounded-2xl overflow-hidden bg-foreground/10 flex items-end p-3.5 md:p-6"
            >
              {heroProduct?.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroProduct.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              {heroProduct && (
                <div className="relative w-full rounded-xl bg-white text-[#0f1115] px-4 py-3 flex max-md:items-center max-md:justify-between md:flex-col gap-1">
                  <span className="font-medium line-clamp-1">{heroProduct.name}</span>
                  <span className="font-serif text-lg">${formatPrice(heroProduct.price)}</span>
                </div>
              )}
            </Link>
            <div className="max-md:hidden rounded-2xl overflow-hidden bg-foreground/5">
              {secondImage?.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={secondImage.image_url} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="max-md:hidden rounded-2xl bg-accent text-accent-foreground p-6 flex flex-col justify-between">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
                <path d="M8.5 11h7M8.5 14h4" />
              </svg>
              <span className="font-serif text-2xl leading-tight">
                Pregunta en tus palabras. Te sugerimos productos concretos.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Categorías */}
      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 md:pt-20">
          <div className="flex items-end justify-between mb-5 md:mb-7">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold">Explora por categoría</h2>
            <Link href="/products" className="text-sm text-muted hover:text-foreground transition-colors py-3">
              Todas
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            {categories.slice(0, 4).map((c) => {
              const img = categoryImage(c.id);
              return (
                <Link
                  key={c.id}
                  href={`/products?category=${c.id}`}
                  className="group flex flex-col justify-between gap-3 h-[132px] md:h-[200px] p-3 md:p-5 rounded-2xl bg-surface border border-border hover:border-foreground/20 transition-colors"
                >
                  <div className="flex-1 rounded-lg overflow-hidden bg-foreground/5">
                    {img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium md:text-lg line-clamp-1">{c.name}</span>
                    <span className="max-md:hidden"><ArrowIcon /></span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Destacados */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 md:pt-20">
        <div className="flex items-end justify-between mb-5 md:mb-7">
          <h2 className="font-serif text-2xl md:text-3xl font-semibold">Destacados</h2>
          <Link href="/products" className="text-sm text-muted hover:text-foreground transition-colors py-3">
            Ver todo
          </Link>
        </div>
        {products.length === 0 ? (
          <p className="text-muted">No hay productos para mostrar.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            {products.slice(0, 8).map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>

      {/* Para ti */}
      <HomeRecommendations />

      {/* Ventajas */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-24 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
        {perks.map((perk) => (
          <div key={perk.title} className="flex md:flex-col gap-3.5 md:gap-3 p-5 md:p-7 rounded-2xl border border-border">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-accent" aria-hidden="true">
              {perk.icon}
            </svg>
            <div className="flex flex-col gap-1 md:gap-2">
              <span className="font-medium md:text-lg">{perk.title}</span>
              <span className="text-sm md:text-[15px] leading-relaxed text-muted">{perk.text}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14 flex flex-col md:flex-row md:justify-between gap-8">
          <div className="flex flex-col gap-2.5">
            <span className="font-serif text-xl font-semibold">Tienda</span>
            <span className="text-sm text-muted">Herramientas buenas, elegidas con cuidado.</span>
          </div>
          <div className="grid grid-cols-2 md:flex md:gap-16 gap-6 text-sm">
            <div className="flex flex-col gap-2.5">
              <span className="font-semibold">Tienda</span>
              <Link href="/products" className="text-muted hover:text-foreground">Productos</Link>
              <Link href="/cart" className="text-muted hover:text-foreground">Carrito</Link>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="font-semibold">Cuenta</span>
              <Link href="/account" className="text-muted hover:text-foreground">Mi perfil</Link>
              <Link href="/account/orders" className="text-muted hover:text-foreground">Mis pedidos</Link>
              <Link href="/register" className="text-muted hover:text-foreground">Crear cuenta</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
