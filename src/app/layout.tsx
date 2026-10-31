import type { Metadata } from "next";
import "./globals.css";
import "./custom-samples.css";
export const metadata: Metadata = {
  title: {
    default: "Pixvo Invitaciones · Tu momento empieza acá",
    template: "%s · Pixvo Invitaciones",
  },
  description:
    "Diseñá una invitación que cuente tu historia. Personalizá tu evento y reuní las respuestas en un solo lugar.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
