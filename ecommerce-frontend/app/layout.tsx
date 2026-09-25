import "./globals.css";
import type { Metadata } from "next";
import { Outfit, Source_Serif_4 } from "next/font/google";
import Header from "@/components/Header";
import { AuthProvider } from "@/lib/auth";
import ToasterClient from "@/components/ToasterClient";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

// Título de la pestaña y vista previa al compartir el enlace.
// Las páginas pueden poner su propio título: "Carrito" -> "Carrito · Ecommerce".
export const metadata: Metadata = {
  title: { default: "Ecommerce", template: "%s · Ecommerce" },
  description:
    "Tienda online con carrito, pagos con Stripe y panel de administración. Proyecto de portafolio hecho con Next.js, Express y PostgreSQL.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${outfit.variable} ${sourceSerif.variable}`}>
      <body>
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
          <ToasterClient />
      </body>
    </html>
  );
}
