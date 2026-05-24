import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const uiFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap"
});

const brandFont = localFont({
  src: "../../public/fonts/GreaterTheory.otf",
  variable: "--font-brand",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Tariff Dashboard",
  description: "Tariff analysis and energy savings optimization dashboard"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className={`${uiFont.className} ${uiFont.variable} ${brandFont.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
