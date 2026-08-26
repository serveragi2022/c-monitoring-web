import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "C-Monitoring System",
  description: "Atlantic Grains Inc. C-Monitoring System",
  // iOS Safari does NOT read manifest.json for "Add to Home Screen" the way Android
  // Chrome does — without these apple-specific tags, iOS installs a plain browser
  // bookmark (address bar + Safari UI visible, generic icon) instead of a standalone
  // app icon. This is why install "worked" on PC (desktop Chrome only needs the
  // manifest, already present via manifest.ts) but not on mobile.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "C-Monitoring",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
  // Stops iOS Safari from auto-linkifying things that look like phone numbers in the
  // UI (e.g. reference numbers), which otherwise renders blue/underlined unexpectedly.
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Colors the mobile browser's address/status bar to match the app once installed —
  // part of what makes it feel like a native app on a phone rather than a webpage.
  themeColor: "#1d5fd6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
