"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { decodeJWTPayload, isTokenExpired } from "@/lib/jwt";

function isAdminFromPayload(p: any): boolean {
  if (!p || typeof p !== "object") return false;
  return p.role === "admin";
}

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const r = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  const token = useMemo(
    () => (typeof window !== "undefined" ? localStorage.getItem("token") : null),
    // repite lectura cuando cambia ruta (útil tras login)
    [pathname]
  );

  useEffect(() => {
    const next = encodeURIComponent(pathname || "/admin");
    if (!token) {
      r.replace(`/login?next=${next}`);
      return;
    }
    if (isTokenExpired(token)) {
      // Antes esto dejaba pasar igual (solo miraba el role del payload,
      // nunca exp) y el panel se rompía en el primer fetch con un 401.
      r.replace(`/login?next=${next}&expired=1`);
      return;
    }
    const payload = decodeJWTPayload(token);
    const ok = isAdminFromPayload(payload);
    if (!ok) {
      // No es admin → al home
      r.replace("/");
      return;
    }
    setChecking(false);
  }, [token, pathname, r]);

  if (checking) return <div className="p-6">Verificando permisos…</div>;
  return <>{children}</>;
}
