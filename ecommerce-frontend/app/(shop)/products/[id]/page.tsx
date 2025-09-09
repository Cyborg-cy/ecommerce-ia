// app/(shop)/products/[id]/page.tsx
import { api } from "@/lib/api";
import BuyBox from "@/components/BuyBox";

type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  stock?: number | null;
};

async function getProduct(id: string): Promise<Product | null> {
  try {
    const { data } = await api.get(`/products/${id}`);
    return data;
  } catch (e) {
    console.error("Error getProduct", e);
    return null;
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
    </div>
  );
}
