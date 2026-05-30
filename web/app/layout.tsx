import type { Metadata } from "next";
import { Syne, DM_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import WalletButton from "@/components/WalletButton";
import NavLinks from "@/components/NavLinks";
import PageBackdrop from "@/components/PageBackdrop";
import SiteFooter from "@/components/SiteFooter";
import Link from "next/link";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RaffleChain",
  description: "Rifas transparentes en blockchain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${syne.variable} ${dmSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <PageBackdrop />
        <div className="app-shell">
          <Providers>
            <header className="sticky top-0 z-50 header-glass">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[4.25rem] flex items-center justify-between gap-4">
                <div className="flex items-center gap-5 sm:gap-8 min-w-0">
                  <Link href="/" className="logo-wrap shrink-0">
                    <span className="logo-icon" aria-hidden>
                      🎟
                    </span>
                    <span className="logo-text">RaffleChain</span>
                  </Link>
                  <NavLinks />
                </div>
                <WalletButton />
              </div>
            </header>
            {children}
            <SiteFooter />
          </Providers>
        </div>
      </body>
    </html>
  );
}
