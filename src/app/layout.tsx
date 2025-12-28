import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./styles/improved-pos.css";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import BootstrapClient from "./components/BootstrapClient";
import { AuthProvider } from "./contexts/AuthContext";
import { StationProvider } from "./contexts/StationContext";
import { PricelistProvider } from "./contexts/PricelistContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "JK PosMan",
  description: "Sales retail app",
  manifest: "/manifest.json",
  themeColor: "#000000",
  icons: {
    icon: [
      { url: "/icons/JKlogo-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/JKlogo-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/icons/JKlogo-192.png", sizes: "192x192", type: "image/png" }
    ]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          <StationProvider>
            <PricelistProvider>
              {children}
            </PricelistProvider>
          </StationProvider>
        </AuthProvider>
        <BootstrapClient />
      </body>
    </html>
  );
}
