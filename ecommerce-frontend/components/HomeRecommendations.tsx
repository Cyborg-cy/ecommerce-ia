"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api-client";

type Product = {
  id: number;
  name: string;
  price: number | string;
  category_name?: string | null;
  image_url?: string | null;
};

type RecsResponse = {
  basedOn?: "user_categories" | "global_newest";
  items?: Product[];
};

// Franja "Para ti" de la home: usa /recommendations/by-user cuando hay sesión.
export default function HomeRecommendations() {
  const { token, loading } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [basedOn, setBasedOn] = useState<RecsResponse["basedOn"]>();

  useEffect(() => {
    if (!token) {
      setItems([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get<RecsResponse>("/recommendations/by-user");
        if (!alive) return;
        setItems(Array.isArray(data?.items) ? data.items.slice(0, 4) : []);
        setBasedOn(data?.basedOn);
      } catch {
        if (alive) setItems([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  if (loading) return null;

  const subtitle = !token
    ? "Se actualiza con tu actividad. Inicia sesión para verlo."
    : basedOn === "user_categories"
      ? "Basado en tus compras y tu carrito."
      : "Novedades mientras conocemos tus gustos.";

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 mt-16 md:mt-24">
      <div className="rounded-2xl bg-foreground text-background p-6 md:p-14 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-semibold tracking-[0.14em] opacity-70">PARA TI</p>
            <h2 className="font-serif text-2xl md:text-4xl font-semibold leading-tight">
              Recomendado según lo que has visto
            </h2>
            <p className="text-sm md:text-base opacity-70">{subtitle}</p>
          </div>
          {!token && (
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-background text-foreground px-5 text-sm font-medium whitespace-nowrap hover:opacity-90"
            >
              Iniciar sesión
            </Link>
          )}
        </div>

        {items.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {items.map((p) => {
              const price = typeof p.price === "number" ? p.price.toFixed(2) : String(p.price ?? "");
              return (
                <Link key={p.id} href={`/products/${p.id}`} className="group flex flex-col gap-3.5">
                  <div className="aspect-square md:aspect-auto md:h-[200px] rounded-xl overflow-hidden bg-background/10 flex items-center justify-center">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <span className="text-xs opacity-60">Sin imagen</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium line-clamp-1">{p.name}</span>
                    {p.category_name && <span className="text-xs opacity-70">{p.category_name}</span>}
                    <span className="mt-1.5 font-serif text-lg">${price}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
