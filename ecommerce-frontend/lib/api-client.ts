// lib/api-client.ts
"use client";

import axios, { InternalAxiosRequestConfig } from "axios";

const BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || "";
if (!BASE) {
  // No pongas localhost por defecto: evita romper el build
  console.warn("NEXT_PUBLIC_API_BASE no está definida (cliente).");
}

export const api = axios.create({
  baseURL: BASE,           // sin "localhost" por defecto
  withCredentials: false,  // usamos Authorization, no cookies
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Cuando el access token expira (401), intenta renovarlo una sola vez con el
// refresh token guardado y reintenta la petición original. Si no hay refresh
// token o también falla, limpia la sesión y manda a /login.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = axios
      .post(`${BASE}/auth/refresh`, { refreshToken })
      .then((res) => {
        const newToken = res.data?.accessToken as string | undefined;
        if (newToken) localStorage.setItem("token", newToken);
        return newToken ?? null;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config;
    if (
      error?.response?.status === 401 &&
      original &&
      !original._retried &&
      !String(original.url).includes("/auth/refresh") &&
      !String(original.url).includes("/auth/login") &&
      !String(original.url).includes("/users/login")
    ) {
      original._retried = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api.request(original);
      }
      // No se pudo renovar: cerrar sesión y mandar a login
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        const next = encodeURIComponent(window.location.pathname);
        window.location.href = `/login?next=${next}&expired=1`;
      }
    }
    return Promise.reject(error);
  }
);

// Helpers mínimos (cliente)
export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
}) {
  const { data } = await api.post("/users/register", payload);
  return data;
}

export async function loginUser(payload: { email: string; password: string }) {
  const { data } = await api.post("/auth/login", payload);
  return data as { accessToken: string; refreshToken: string };
}
