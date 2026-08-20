import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Condensed, IBM_Plex_Mono, Geist, Geist_Mono, Newsreader } from "next/font/google";
import { WindowScrollRestoration } from "@/components/navigation/WindowScrollRestoration";
import { PwaRegister } from "@/components/PwaRegister";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BootViewScript } from "@/components/BootViewScript";
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

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const ibmPlexCondensed = IBM_Plex_Sans_Condensed({
  variable: "--font-ibm-plex-condensed",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TradeCity — East Africa",
  description:
    "Resilient Deriv trading shell for East Africa with Web Worker WebSocket engine",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TradeCity",
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
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} ${ibmPlexSans.variable} ${ibmPlexCondensed.variable} ${ibmPlexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
        <BootViewScript />
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
