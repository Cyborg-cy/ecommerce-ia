import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

export const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000",
  withCredentials: false, // usamos JWT en header, no cookies
});

// Interceptor para inyectar headers de forma tipada (Axios v1)
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (config.headers) {
      const h = config.headers as any;
      if (typeof h.set === "function") {
        h.set("Content-Type", "application/json");
        if (token) h.set("Authorization", `Bearer ${token}`);
      } else {
        h["Content-Type"] = "application/json";
        if (token) h["Authorization"] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ===== Helpers =====

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
  return data as { token: string };
}