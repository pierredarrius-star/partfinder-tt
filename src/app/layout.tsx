import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0f172a", // slate-900
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents zooming on inputs for an App-like feel
};

export const metadata: Metadata = {
  title: "Partfinder - T&T Auto Parts Local Search",
  description: "Find auto parts from suppliers across Trinidad and Tobago in seconds.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pathfinder",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-slate-50 antialiased">
      <body
        className={`${outfit.variable} font-sans h-full overflow-hidden flex flex-col`}
      >
        <div className="flex-1 overflow-y-auto pb-safe">
          <main className="mx-auto max-w-md w-full min-h-full bg-white shadow-xl relative pb-20">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
