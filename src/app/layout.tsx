import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import TabBar from "@/components/TabBar";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0F0E0D", // charcoal
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents zooming on inputs for an App-like feel
};

export const metadata: Metadata = {
  title: "PartFinder - T&T Auto Parts Local Search",
  description: "Find auto parts from suppliers across Trinidad and Tobago in seconds.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PartFinder",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-charcoal antialiased">
      <body
        className={`${geist.variable} ${geistMono.variable} ${bricolage.variable} font-sans h-full overflow-hidden flex flex-col`}
      >
        <div className="flex-1 overflow-y-auto pb-safe">
          <main className="mx-auto max-w-md w-full min-h-full bg-charcoal shadow-xl relative pb-20">
            {children}
          </main>
        </div>
        <TabBar />
      </body>
    </html>
  );
}
