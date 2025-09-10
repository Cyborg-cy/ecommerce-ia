"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const r = useRouter();

  useEffect(() => {
    if (!token) r.replace("/login");
  }, [token, r]);

  if (!token) return null; // mientras redirige
  return <>{children}</>;
}
