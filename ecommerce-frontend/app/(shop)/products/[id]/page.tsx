// app/(shop)/products/[id]/page.tsx
import { api } from "@/lib/api";
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

async function getProduct(id: string) {
  const pid = Number.parseInt(id, 10);
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error("ID inválido");
  }
  try {
    const { data } = await api.get(`/products/${pid}`);
    return data as Product;
  } catch (e: any) {
    console.error("GET /products/:id error", {
      status: e?.response?.status,
      data: e?.response?.data,
    });
    throw new Error(e?.response?.data?.error || "No se pudo cargar el producto");
  }
}

export default async function ProductDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // Next 15
  const p = await getProduct(id);
  if (!p) return <p>Producto no encontrado</p>;

  const price =
    typeof p.price === "number" ? p.price.toFixed(2) : String(p.price ?? "");

  return (
    <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Imagen */}
      <div className="bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden min-h-[260px]">
        {p.image_url ? (
          <SafeImage
            src={p.image_url}
            alt={p.name}
            className="max-h-[460px] w-auto object-contain"
          />
        ) : (
          <span className="text-gray-400 text-sm">Sin imagen</span>
        )}
      </div>

      {/* Info */}
      <div>
        <h1 className="text-3xl font-bold">{p.name}</h1>
        {p.description && (
          <p className="text-gray-300 md:text-gray-600 mt-3">{p.description}</p>
        )}

        <p className="text-2xl font-semibold mt-5">${price}</p>

        {/* Caja de compra (cliente) */}
        <div className="mt-4">
          <BuyBox productId={Number(id)} />
        </div>

        {/* Recomendaciones */}
        <div className="mt-8">
          <Recommendations productId={p.id} />
        </div>
      </div>
    </div>
  );
}
