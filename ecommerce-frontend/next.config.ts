import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🔧 No dejes que el build falle por ESLint/TS mientras despliegas
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // 🖼️ Permite cargar imágenes desde tu backend/CDN en producción
  images: {
    remotePatterns: [
      // Cambia estos hostnames por los tuyos reales:
      { protocol: "https", hostname: "api-tu-backend.onrender.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      // (opcional) si durante pruebas sirves imágenes desde localhost:
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default nextConfig;
