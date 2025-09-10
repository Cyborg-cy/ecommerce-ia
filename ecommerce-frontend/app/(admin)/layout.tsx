"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { token, user, is_admin, refreshMe } = useAuth();
  const r = useRouter();

  useEffect(() => {
    // Si tengo token pero aún no tengo user cargado, intento refrescar
    if (token && !user) refreshMe();
  }, [token, user, refreshMe]);

  useEffect(() => {
    if (!token) r.replace("/login");
    else if (!(user?.is_admin ?? is_admin)) r.replace("/");
  }, [token, user, is_admin, r]);

  if (!token) return <p className="p-6">Redirigiendo a login…</p>;
  if (!(user?.is_admin ?? is_admin)) return <p className="p-6">Verificando acceso…</p>;

  return (
    <div className="p-6 space-y-6">
      <nav className="flex gap-6 border-b pb-3">
        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/products">Productos</Link>
        <Link href="/admin/categories">Categorías</Link>
      </nav>
      {children}
    </div>
  );
}
