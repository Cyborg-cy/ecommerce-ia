import "./globals.css";
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
