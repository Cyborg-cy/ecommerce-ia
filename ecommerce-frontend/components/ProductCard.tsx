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
  const price = typeof p.price === "number" ? p.price.toFixed(2) : String(p.price ?? "");
  const outOfStock = (p.stock ?? 0) <= 0;

  return (
    <Link
      href={`/products/${p.id}`}
      className="group block rounded-lg overflow-hidden bg-surface border border-border hover:border-foreground/20 hover:-translate-y-0.5 transition-all"
    >
      <div className="w-full aspect-square bg-background overflow-hidden flex items-center justify-center relative">
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.image_url}
            alt={p.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <span className="text-xs text-muted">Sin imagen</span>
        )}
        {outOfStock && (
          <span className="absolute top-2 left-2 rounded-full bg-foreground text-background text-[11px] font-medium px-2 py-0.5">
            Agotado
          </span>
        )}
      </div>
      <div className="p-3.5">
        <div className="font-medium line-clamp-1">{p.name}</div>
        {p.category_name && (
          <div className="text-xs text-muted mt-0.5">{p.category_name}</div>
        )}
        <div className="mt-2 font-serif text-lg">${price}</div>
      </div>
    </Link>
  );
}