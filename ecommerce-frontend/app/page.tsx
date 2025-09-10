// app/page.tsx
import Link from "next/link";

type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  category_name?: string | null;
};

async function getProducts(): Promise<Product[]> {
  const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
  try {
    const res = await fetch(`${base}/products`, { cache: "no-store" });
    if (!res.ok) throw new Error(`API /products respondió ${res.status}`);
    const data = await res.json();
    // 🔑 Ajusta según el formato real
    if (Array.isArray(data)) {
      return data;              // Caso 1: backend devuelve array directo
    } else if (Array.isArray(data.items)) {
      return data.items;        // Caso 2: backend devuelve {items, meta}
    } else {
      console.error("Formato inesperado de /products:", data);
      return [];
    }
  } catch (e) {
    console.error("Home getProducts error:", e);
    return [];
  }
}

export default async function Home() {
  const products = await getProducts();

  return (
    <main className="p-6 space-y-8">
      {/* Hero simple */}
      <section className="rounded-2xl p-8 bg-gray-100">
        <h1 className="text-3xl text-gray-600">Bienvenido a ALWAYS BUY</h1>
        <p className="text-gray-600">Ofertas y novedades cada semana.</p>
        <div className="mt-4">
          <Link
            href="/products"
            className="inline-block rounded-lg px-4 py-2 bg-black text-white"
          >
            Ver productos
          </Link>
        </div>
      </section>

      {/* Destacados */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Destacados</h2>
        {products.length === 0 ? (
          <p className="text-gray-500">No hay productos para mostrar.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {products.slice(0, 6).map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="border rounded-xl p-4 hover:shadow"
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-gray-500">
                  {p.category_name || "General"}
                </div>
                <div className="mt-2 font-semibold">
                  ${typeof p.price === "string" ? p.price : p.price.toFixed(2)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}