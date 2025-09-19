import Link from "next/link";

type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  stock?: number | null;
  category_id?: number | null;
  category_name?: string | null;
};

export default function ProductCard({ p }: { p: Product }) {
  const price =
    typeof p.price === "number" ? p.price.toFixed(2) : String(p.price ?? "");

  return (
    <Link
      href={`/products/${p.id}`} // URL pública (el (shop) no aparece en la ruta)
      className="block rounded border p-3 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-black transition cursor-pointer"
    >
      <div className="font-medium line-clamp-1">{p.name}</div>
      <div className="text-sm text-gray-500 mt-1">${price}</div>
      <div className="text-xs text-gray-400 mt-1">
        Stock: {p.stock ?? 0}
      </div>
    </Link>
  );
}
