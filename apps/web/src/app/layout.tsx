import "./globals.css";
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: {
    default: "WP Performance Scanner",
    template: "%s · WP Performance Scanner",
  },
  description: "Analiza webs WordPress y genera informes automáticos de rendimiento con Playwright.",
  icons: {
    icon: "/favicon.svg",
  },
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
