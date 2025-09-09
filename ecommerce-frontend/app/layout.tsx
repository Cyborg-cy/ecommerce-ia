import "./globals.css";
import Header from "@/components/Header";
import { AuthProvider } from "@/lib/auth";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
