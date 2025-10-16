// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://reservaspower.com"),
  title: {
    default: "Reservas Power | Turnos online fáciles",
    template: "%s | Reservas Power",
  },
  description:
    "Sistema de reservas para estudios y gimnasios. Gestioná clases, profesores y turnos con confirmaciones en un clic.",
  applicationName: "Reservas Power",
  keywords: [
    "reservas", "turnos", "gimnasio", "clases", "power pole", "agenda online", "San Luis"
  ],
  authors: [{ name: "Reservas Power" }],
  openGraph: {
    type: "website",
    url: "https://reservaspower.com",
    title: "Reservas Power | Turnos online fáciles",
    description:
      "Reservá y gestioná clases en segundos. Agenda, pagos y recordatorios en un mismo lugar.",
    siteName: "Reservas Power",
    images: [
      {
        url: "/og.jpg", // poné una imagen 1200x630 en /public
        width: 1200,
        height: 630,
        alt: "Reservas Power",
      },
    ],
    locale: "es_AR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reservas Power | Turnos online fáciles",
    description:
      "Reservá y gestioná clases en segundos. Agenda, pagos y recordatorios en un mismo lugar.",
    images: ["/og.jpg"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  themeColor: "#53107F",
  alternates: { canonical: "https://reservaspower.com" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
