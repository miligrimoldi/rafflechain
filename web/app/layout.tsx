import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import WalletButton from "@/components/WalletButton";
import NavLinks from "@/components/NavLinks";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
            <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
              <div className="flex items-center gap-12">
                <Link href="/" className="text-lg font-bold text-indigo-600 tracking-tight">
                  RaffleChain
                </Link>
                <NavLinks />
              </div>
              <WalletButton />
            </div>
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
