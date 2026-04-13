import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import { PlayerProvider } from "@/context/PlayerContext";
import MusicPlayer from "@/app/components/MusicPlayer";
import NotificationOverlay from "@/app/components/NotificationOverlay";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrebleMaker | Universal Music Discovery",
  description: "Bypass platform limits. Discover and bridge music across YouTube and Spotify.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers>
          <PlayerProvider>
            {children}
            <MusicPlayer />
            <NotificationOverlay />
          </PlayerProvider>
        </Providers>
      </body>
    </html>
  );
}
