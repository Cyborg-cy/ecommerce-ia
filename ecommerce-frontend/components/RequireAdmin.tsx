"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { ready, token, user } = useAuth();
  const r = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!ready) return; // espera a que cargue localStorage

    if (!token) {
      r.replace("/login");
      return;
    }
    if (!user?.is_admin) {
      r.replace("/");
      return;
    }
    setChecking(false);
  }, [ready, token, user, r]);

  if (!ready || checking) {
    return <div className="p-6">Verificando sesión…</div>;
  }
  return <>{children}</>;
}
