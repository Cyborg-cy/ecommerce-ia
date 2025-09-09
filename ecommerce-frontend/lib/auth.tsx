"use client";

import { createContext, useContext, useEffect, useState } from "react";

type User = { id: number; name: string; email: string } | null;

type AuthCtx = {
  token: string | null;
  user: User;
  loading: boolean;
  setToken: (t: string | null) => void;
  setUser: (u: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthCtx>({
  token: null,
  user: null,
  loading: true,
  setToken: () => {},
  setUser: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  // Cargar estado inicial desde localStorage
  useEffect(() => {
    try {
      const t = localStorage.getItem("token");
      const u = localStorage.getItem("user");
      if (t) setToken(t);
      if (u) setUser(JSON.parse(u));
    } catch {}
    setLoading(false);
  }, []);

  // Persistir cambios
  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ token, user, loading, setToken, setUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
