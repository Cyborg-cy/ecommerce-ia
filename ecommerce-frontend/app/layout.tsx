import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";


export const metadata: Metadata = { title: "E‑Shop", description: "E‑commerce con IA" };


export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="es">
<body className="bg-gray-50 text-gray-900">
<Navbar />
<main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
</body>
</html>
);
}