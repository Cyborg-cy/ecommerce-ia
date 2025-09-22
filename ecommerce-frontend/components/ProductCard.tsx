import Link from "next/link";

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

export default function ProductCard({ p }: { p: Product }) {
  const price =
    typeof p.price === "number" ? p.price.toFixed(2) : String(p.price ?? "");

 return (
    <Link
      href={`/products/${p.id}`}
      className="block rounded border hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-black transition cursor-pointer"
    >
      {/* Imagen */}
      <div className="w-full h-48 bg-gray-100 flex items-center justify-center overflow-hidden rounded-t">
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Oculta la imagen si falla
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="text-gray-400 text-sm">Sin imagen</span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="font-medium line-clamp-1">{p.name}</div>
        <div className="text-sm text-gray-500 mt-1">${price}</div>
        <div className="text-xs text-gray-400 mt-1">
          Stock: {p.stock ?? 0}
        </div>
      </div>
    </Link>
  );
}