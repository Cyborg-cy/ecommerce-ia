"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminGate from "@/components/AdminGate";
import { useAuth } from "@/lib/auth";

const NAV = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </>
    ),
  },
  {
    href: "/admin/products",
    label: "Productos",
    icon: (
      <>
        <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
        <path d="m3 8 9 5 9-5M12 13v8" />
      </>
    ),
  },
  {
    href: "/admin/orders",
    label: "Pedidos",
    icon: (
      <>
        <path d="M6 3h12l2 5v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8Z" />
        <path d="M4 8h16M9 12h6" />
      </>
    ),
  },
  {
    href: "/admin/users",
    label: "Usuarios",
    icon: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" />
        <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.8.7 3 2.4 3 5.2" />
      </>
    ),
  },
  {
    href: "/admin/categories",
    label: "Categorías",
    icon: (
      <>
        <path d="M20 12 12 20l-8-8V4h8Z" />
        <circle cx="8.5" cy="8.5" r="1.3" />
      </>
    ),
  },
];

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
      {children}
    </svg>
  );
}

function NavLink({ href, label, icon }: (typeof NAV)[number]) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`h-11 px-3 rounded-lg flex items-center gap-3 text-[15px] whitespace-nowrap transition-colors ${
        active ? "bg-accent text-accent-foreground font-medium" : "text-[#c3c9d2] hover:text-white hover:bg-white/10"
      }`}
    >
      <NavIcon>{icon}</NavIcon>
      {label}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <AdminGate>
      <div className="min-h-screen bg-background md:flex">
        {/* Sidebar (en móvil se vuelve una barra superior con scroll horizontal) */}
        <aside className="bg-[#0f1115] text-[#f2f4f7] md:w-62 md:shrink-0 flex flex-col gap-4 md:gap-8 px-4 py-4 md:py-6">
          <div className="flex items-center gap-2.5 px-2">
            <Link href="/" className="font-serif text-xl font-semibold text-[#f2f4f7]">Tienda</Link>
            <span className="text-[#5b6472]">/</span>
            <span className="text-sm text-[#a9b1bd]">Admin</span>
          </div>

          <nav className="flex md:flex-col gap-1 overflow-x-auto -mx-1 px-1">
            {NAV.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>

          <div className="hidden md:flex mt-auto flex-col gap-1">
            <Link
              href="/"
              className="h-11 px-3 rounded-lg flex items-center gap-3 text-sm text-[#c3c9d2] hover:text-white hover:bg-white/10"
            >
              <NavIcon>
                <path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5" />
                <path d="m14 8-4 4 4 4M10 12h11" />
              </NavIcon>
              Ver tienda
            </Link>
            {user && (
              <div className="p-3 rounded-xl bg-[#1b1f25] flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-[#262b33] flex items-center justify-center text-sm font-semibold shrink-0">
                  {(user.name || user.email || "A").charAt(0).toUpperCase()}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{user.name}</span>
                  <span className="text-xs text-[#a9b1bd] truncate">{user.email}</span>
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 min-w-0 px-4 md:px-10 py-6 md:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </AdminGate>
  );
}
