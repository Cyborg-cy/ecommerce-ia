"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

function b64urlToB64(s: string) {
  return s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
}
function decodeJWTPayload(token: string): any | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = atob(b64urlToB64(payload));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
function isAdminFromPayload(p: any): boolean {
  if (!p || typeof p !== "object") return false;
  if (p.role === "admin") return true;
  if (p.is_admin === true) return true; // compat
  return false;
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
