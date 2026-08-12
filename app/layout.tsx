import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { WindowScrollRestoration } from "@/components/navigation/WindowScrollRestoration";
import { PwaRegister } from "@/components/PwaRegister";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeScript } from "@/components/ThemeScript";
import { THEME_META_COLORS } from "@/lib/theme/settings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-marketing-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Deriv Platform — East Africa",
  description:
    "Resilient Deriv trading shell for East Africa with Web Worker WebSocket engine",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Deriv EA",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_META_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_META_COLORS.dark },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <ThemeProvider>
          <WindowScrollRestoration />
          {children}
        </ThemeProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
