"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { decodeJWTPayload } from "@/lib/jwt";

type User = { id: number; name: string; email: string; role: string } | null;

type AuthCtx = {
  token: string | null;
  refreshToken: string | null;
  user: User;
  loading: boolean;
  /** Guarda accessToken + refreshToken tras un login exitoso */
  login: (accessToken: string, refreshToken: string) => void;
  /** Reemplaza solo el accessToken (lo usa el interceptor al renovar sesión) */
  setToken: (t: string | null) => void;
  /** Compat: ya no hace falta llamarlo, `user` se deriva del token */
  setUser: (u: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthCtx>({
  token: null,
  refreshToken: null,
  user: null,
  loading: true,
  login: () => {},
  setToken: () => {},
  setUser: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [refreshToken, setRefreshTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar estado inicial desde localStorage
  useEffect(() => {
    try {
      const t = localStorage.getItem("token");
      const rt = localStorage.getItem("refreshToken");
      if (t) setTokenState(t);
      if (rt) setRefreshTokenState(rt);
    } catch {}
    setLoading(false);
  }, []);

  function setToken(t: string | null) {
    setTokenState(t);
    try {
      if (t) localStorage.setItem("token", t);
      else localStorage.removeItem("token");
    } catch {}
  }

  function setRefreshToken(rt: string | null) {
    setRefreshTokenState(rt);
    try {
      if (rt) localStorage.setItem("refreshToken", rt);
      else localStorage.removeItem("refreshToken");
    } catch {}
  }

  function login(accessToken: string, newRefreshToken: string) {
    setToken(accessToken);
    setRefreshToken(newRefreshToken);
  }

  function logout() {
    // best-effort: revoca el refresh token en el servidor
    const rt = refreshToken;
    setToken(null);
    setRefreshToken(null);
    if (rt) {
      const base = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || "";
      fetch(`${base}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      }).catch(() => {});
    }
  }

  // El usuario se deriva siempre del token vigente — el backend nunca
  // mandó un objeto `user` aparte, así que antes esto quedaba en null.
  const user = useMemo<User>(() => {
    if (!token) return null;
    const payload = decodeJWTPayload(token);
    if (!payload) return null;
    return { id: payload.id, name: payload.name, email: payload.email, role: payload.role };
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        token,
        refreshToken,
        user,
        loading,
        login,
        setToken,
        setUser: () => {}, // compat: no-op, user se deriva del token
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
