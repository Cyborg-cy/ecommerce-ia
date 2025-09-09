import axios, { InternalAxiosRequestConfig } from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000",
  withCredentials: false, // usamos header Authorization, no cookies
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

// Helpers mínimos
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
