"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminGate from "@/components/AdminGate";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded text-sm ${
        active ? "bg-black text-white" : "hover:bg-gray-100"
      }`}
    >
      {children}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGate>
      <div className="min-h-screen bg-white">
        <header className="border-b">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="font-semibold">E-Commerce</Link>
              <span className="text-gray-300">/</span>
              <span className="font-medium">Admin</span>
            </div>
            <nav className="flex items-center gap-1">
              <NavLink href="/admin">Dashboard</NavLink>
              <NavLink href="/admin/products">Productos</NavLink>
              <NavLink href="/admin/orders">Pedidos</NavLink>
              <NavLink href="/admin/users">Usuarios</NavLink>
              <NavLink href="/admin/categories">Categorías</NavLink>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </div>
    </AdminGate>
  );
}
