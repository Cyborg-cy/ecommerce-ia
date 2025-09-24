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
  const { data } = await api.post("/users/login", payload);
  return data; // { token, user? }
}
