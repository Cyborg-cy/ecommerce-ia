"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api-client";
import { usePathname, useRouter } from "next/navigation";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`text-sm transition-colors ${
        active ? "text-accent font-medium" : "text-foreground/70 hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

export default function Header() {
  const { token, user, logout } = useAuth();
  const [cartCount, setCartCount] = useState<number>(0);
  const r = useRouter();

  // Actualiza el contador del carrito cuando hay token
  async function refreshCartCount() {
    if (!token) {
      setCartCount(0);
      return;
    }
    try {
      const { data } = await api.get("/cart");
      setCartCount(Array.isArray(data?.items) ? data.items.length : 0);
    } catch {
      setCartCount(0);
    }
  }

  useEffect(() => {
    refreshCartCount();
  }, [token]);

  function handleLogout() {
    logout();        // limpia token y user (localStorage también)
    setCartCount(0); // limpia badge
    r.push("/");     // vuelve a Home
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-6">
        {/* Izquierda: marca / navegación */}
        <nav className="flex items-center gap-6">
          <Link href="/" className="font-serif text-lg tracking-tight">
            Tienda
          </Link>
          <div className="hidden sm:flex items-center gap-5">
            <NavLink href="/products">Productos</NavLink>
            {token && <NavLink href="/account/orders">Mis pedidos</NavLink>}
          </div>
        </nav>

        {/* Derecha: carrito / sesión */}
        <div className="flex items-center gap-4">
          {token && (
            <Link
              href="/cart"
              className="relative text-sm text-foreground/70 hover:text-foreground transition-colors"
            >
              Carrito
              {cartCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
                  {cartCount}
                </span>
              )}
            </Link>
          )}

          {token ? (
            <>
              <span className="hidden md:inline text-sm text-muted">
                {user?.name ? `Hola, ${user.name}` : "Sesión activa"}
              </span>
              <button
                onClick={handleLogout}
                className="px-3.5 py-1.5 rounded-md border border-border text-sm hover:bg-foreground hover:text-background hover:border-foreground"
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-foreground/70 hover:text-foreground transition-colors">
                Entrar
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 rounded-md bg-foreground text-background text-sm hover:opacity-90"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
