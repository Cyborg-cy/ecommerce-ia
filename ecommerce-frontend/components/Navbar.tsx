"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function Navbar() {
  const { token, logout } = useAuth();

  return (
    <header className="w-full border-b bg-white">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold">Ecommerce-IA</Link>
        <nav className="flex items-center gap-4">
          <Link href="/products" className="hover:underline">Productos</Link>
          <Link href="/cart" className="hover:underline">Carrito</Link>
          {token ? (
            <>
              <Link href="/account" className="hover:underline">Mi cuenta</Link>
              <button onClick={logout} className="px-3 py-1 rounded bg-gray-200">
                Salir
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">Entrar</Link>
              <Link href="/register" className="hover:underline">Crear cuenta</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
