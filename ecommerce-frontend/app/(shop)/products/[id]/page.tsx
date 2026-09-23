// app/(shop)/products/[id]/page.tsx
import { notFound } from "next/navigation";
import BuyBox from "@/components/BuyBox";
import Recommendations from "@/components/Recommendations";
import SafeImage from "@/components/SafeImage";

type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  stock?: number | null;
  image_url?: string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE as string;

async function getProduct(id: string): Promise<Product> {
  const pid = Number.parseInt(id, 10);
  if (!Number.isInteger(pid) || pid <= 0) {
    // ID malformado -> 404
    notFound();
  }

  if (!API_BASE) {
    // En Vercel te faltó setear la env
    throw new Error("Falta NEXT_PUBLIC_API_BASE en el entorno de Vercel");
  }

  const url = `${API_BASE}/products/${pid}`;
  const res = await fetch(url, { cache: "no-store" });

  if (res.status === 404) {
    notFound();
  }
  if (!res.ok) {
    // Levanta un error claro para tu app/error.tsx
    const text = await res.text().catch(() => "");
    throw new Error(`GET ${url} -> ${res.status} ${text}`);
  }

  const data = (await res.json()) as Product;
  return data;
}

// SEO dinámico (opcional pero recomendado)
export async function generateMetadata({ params }: { params: { id: string } }) {
  try {
    const p = await getProduct(params.id);
    return {
      title: `${p.name} | E-commerce`,
      description: p.description ?? "",
      openGraph: { images: p.image_url ? [p.image_url] : [] },
    };
  } catch {
    // Si falla el fetch, no rompas el build/SSR
    return { title: "Producto | E-commerce" };
  }
}

export default async function ProductDetail({
  params,
}: {
  params: { id: string };
}) {
  const p = await getProduct(params.id);

  const price =
    typeof p.price === "number" ? p.price.toFixed(2) : String(p.price ?? "");

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Imagen */}
        <div className="bg-background border border-border rounded-lg flex items-center justify-center overflow-hidden min-h-[320px] aspect-square">
          {p.image_url ? (
            <SafeImage
              src={p.image_url}
              alt={p.name}
              className="max-h-[460px] w-auto object-contain"
            />
          ) : (
            <span className="text-muted text-sm">Sin imagen</span>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="font-serif text-3xl leading-tight">{p.name}</h1>
          {p.description && (
            <p className="text-muted mt-3 leading-relaxed">{p.description}</p>
          )}

          <p className="font-serif text-3xl text-accent mt-6">${price}</p>

          {/* Caja de compra (cliente) */}
          <div className="mt-6">
            <BuyBox productId={Number(params.id)} />
          </div>
        </div>
      </div>

      {/* Recomendaciones */}
      <div className="mt-16">
        <Recommendations productId={p.id} />
      </div>
    </div>
  );
}
