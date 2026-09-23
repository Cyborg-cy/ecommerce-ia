// lib/jwt.ts
// Decodifica el payload de un JWT en el cliente (sin verificar firma —
// eso ya lo hizo el backend; aquí solo leemos los datos para la UI).

export type JWTPayload = {
  id: number;
  name: string;
  email: string;
  role: string;
  [key: string]: unknown;
};

function b64urlToB64(s: string) {
  return s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
}

export function decodeJWTPayload(token: string): JWTPayload | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = atob(b64urlToB64(payload));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJWTPayload(token);
  if (!payload || typeof payload.exp !== "number") return true;
  return Date.now() >= payload.exp * 1000;
}
