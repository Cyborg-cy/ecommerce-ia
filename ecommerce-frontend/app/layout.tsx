import "./globals.css";
import Header from "@/components/Header";
import { AuthProvider } from "@/lib/auth";
import ToasterClient from "@/components/ToasterClient";
import SiteHeader from "@/components/SiteHeader";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
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
