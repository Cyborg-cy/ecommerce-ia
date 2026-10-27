"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const r = useRouter();
  const pathname = usePathname();

  // Hasta que AuthProvider lee localStorage, token es null aunque haya sesión:
  // redirigir antes mandaba a /login (y de ahí a la portada) en cada F5.
  useEffect(() => {
    if (!loading && !token) r.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
  }, [loading, token, pathname, r]);

  if (loading || !token) return null; // cargando sesión o mientras redirige
  return <>{children}</>;
}
