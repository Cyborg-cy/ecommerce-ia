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
      className={`px-3 py-2 rounded-md text-sm transition-colors ${
        active ? "bg-accent text-accent-foreground" : "text-white/70 hover:text-white hover:bg-white/10"
      }`}
    >
      {children}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGate>
      <div className="min-h-screen bg-background">
        <header className="bg-foreground text-white">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-6">
            <div className="flex items-center gap-3 shrink-0">
              <Link href="/" className="font-serif text-lg">Tienda</Link>
              <span className="text-white/30">/</span>
              <span className="text-sm text-white/70">Admin</span>
            </div>
            <nav className="flex items-center gap-1 overflow-x-auto">
              <NavLink href="/admin">Dashboard</NavLink>
              <NavLink href="/admin/products">Productos</NavLink>
              <NavLink href="/admin/orders">Pedidos</NavLink>
              <NavLink href="/admin/users">Usuarios</NavLink>
              <NavLink href="/admin/categories">Categorías</NavLink>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
    </AdminGate>
  );
}
