// lib/api-server.ts
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || "";
if (!API_BASE) {
  console.warn("NEXT_PUBLIC_API_BASE no está definida (servidor).");
}

export async function apiFetch(path: string, init?: RequestInit) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  // Evita SSG estricto. Si prefieres ISR, quita no-store y pon revalidate en la página.
  return fetch(url, { cache: "no-store", ...init });
}
