"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

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
    <header className="border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Izquierda: marca / navegación */}
        <nav className="flex items-center gap-4">
          <Link href="/" className="font-semibold">Tienda</Link>
          <Link href="/products" className="text-sm text-gray-700 hover:underline">
            Productos
          </Link>
          {token && (
            <Link href="/account/orders" className="text-sm text-gray-700 hover:underline">
  Mis pedidos
</Link>
          )}
          {token && cartCount > 0 && (
            <Link href="/cart" className="text-sm text-gray-700 hover:underline">
  Carrito ({cartCount})
</Link>
          )}
        </nav>

        {/* Derecha: sesión */}
        <div className="flex items-center gap-3">
          {token ? (
            <>
              <span className="text-sm text-gray-600">
                {user?.name ? `Hola, ${user.name}` : "Sesión activa"}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1 rounded bg-black text-white text-sm"
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm hover:underline">Entrar</Link>
              <Link
                href="/register"
                className="px-3 py-1 rounded bg-black text-white text-sm"
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
