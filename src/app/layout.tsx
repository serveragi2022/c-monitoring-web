import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "C-Monitoring | C-Monitoring System",
  description: "Atlantic Grains Inc. C-Monitoring System",
  applicationName: "C-Monitoring",
  // iOS Safari doesn't read the web manifest for "Add to Home Screen" the way Chrome/Android
  // does — it needs these meta tags instead to launch standalone (no browser chrome, no URL
  // bar) once installed.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "C-Monitoring",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
