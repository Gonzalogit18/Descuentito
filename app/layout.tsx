import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Descuentito — Descuentos vigentes hoy",
  description:
    "Asistente de IA que te dice qué descuentos de bancos, tarjetas y billeteras están activos hoy en marcas argentinas.",
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {/* Living ambient background — drifting radial blobs + cyan aurora.
            Pure CSS, GPU-friendly, disabled under prefers-reduced-motion. */}
        <div className="bg-field" aria-hidden />
        <div className="bg-aurora" aria-hidden />
        {children}
      </body>
    </html>
  );
}
