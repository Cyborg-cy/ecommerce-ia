// app/(shop)/products/[id]/page.tsx
import { api } from "@/lib/api";
import BuyBox from "@/components/BuyBox";
import Recommendations from "@/components/Recommendations";



type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  stock?: number | null;
};

async function getProduct(id: string) {
  const pid = Number.parseInt(id, 10);
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error("ID inválido");
  }
  try {
    const { data } = await api.get(`/products/${pid}`);
    return data;
  } catch (e: any) {
    // Log más explícito para depurar
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
  const { id } = await params;         // 👈 importante en Next 15
  const product = await getProduct(id);
  if (!product) return <p>Producto no encontrado</p>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">{product.name}</h1>
      {product.description && <p>{product.description}</p>}
      <p className="text-xl font-semibold">
        ${typeof product.price === "string" ? product.price : product.price.toFixed(2)}
      </p>

      {/* Caja cliente con input + botón */}
      <BuyBox productId={Number(id)} />
      <Recommendations productId={product.id} />
    </div>
  );
}
