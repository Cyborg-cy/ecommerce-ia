// ecommerce-frontend/lib/api.ts
import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosHeaders, // 👈 importa AxiosHeaders
} from "axios";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "http://localhost:3000";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  try {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      // Asegura que sea AxiosHeaders y usa .set()
      const headers =
        (config.headers as AxiosHeaders) || new AxiosHeaders();
      headers.set("Authorization", `Bearer ${token}`);
      config.headers = headers;
    }
  } catch {
    /* no-op */
  }
  return config;
});

// (resto de tus helpers)
export async function fetchUsers() {
  const { data } = await api.get("/users");
  return data as Array<{ id: number; name: string; email: string }>;
}

export async function registerUser(body: { name: string; email: string; password: string }) {
  const { data } = await api.post("/users/register", body);
  return data;
}

export async function loginUser(body: { email: string; password: string }) {
  const { data } = await api.post("/users/login", body);
  if (typeof window !== "undefined" && data?.token) {
    localStorage.setItem("token", data.token);
  }
  return data;
}
