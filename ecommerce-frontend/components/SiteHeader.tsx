"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import toast from "react-hot-toast";
import { useMemo } from "react";

function isAdmin(user: any) {
  // acepta dos modelos: user.role === 'admin' o user.is_admin === true
  return user?.role === "admin" || user?.is_admin === true;
}

export default function SiteHeader() {
  const pathname = usePathname();
  const r = useRouter();
  const { token, user, setToken, setUser, logout } = useAuth();

  const hello = useMemo(() => {
    const name = (user?.name || user?.email || "").trim();
    return name ? `Hola, ${name.split(" ")[0]}` : "Hola";
  }, [user]);

  async function doLogout() {
    try {
      // si tu contexto ya tiene logout(), úsalo; si no, hacemos fallback
      if (typeof logout === "function") {
        await logout();
      } else {
        localStorage.removeItem("token");
        setToken?.(null as any);
        setUser?.(null as any);
      }
      toast.success("Sesión cerrada");
      r.replace("/"); // a home
    } catch (_e) {
      toast.error("No se pudo cerrar sesión");
    }
  }

  const linkCls = (href: string) =>
    `px-2 py-1 rounded hover:bg-gray-100 ${pathname === href ? "font-semibold underline" : ""}`;

  return (
    <header className="w-full border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Link href="/" className="text-lg font-bold">E-Commerce</Link>
          <nav className="hidden sm:flex items-center gap-1 ml-2">
            <Link href="/products" className={linkCls("/products")}>Productos</Link>

            {/* Solo con sesión mostramos carrito y pedidos */}
            {token ? (
              <>
                <Link href="/cart" className={linkCls("/cart")}>Carrito</Link>
                <Link href="/orders" className={linkCls("/orders")}>Mis pedidos</Link>
              </>
            ) : null}

            {/* Link Admin visible solo si es admin */}
            {user && isAdmin(user) ? (
              <Link href="/admin" className={linkCls("/admin")}>Admin</Link>
            ) : null}
          </nav>
        </div>

        {/* Right side: sesión */}
        <div className="flex items-center gap-3">
          {token ? (
            <>
              <span className="text-sm text-gray-600">{hello}</span>
              <button
                onClick={doLogout}
                className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm px-3 py-1 rounded border hover:bg-gray-50">
                Entrar
              </Link>
              <Link href="/register" className="text-sm px-3 py-1 rounded bg-black text-white">
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
