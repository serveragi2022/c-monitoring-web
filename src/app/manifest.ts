import type { MetadataRoute } from "next";

// Next.js serves this at /manifest.webmanifest automatically and links it from <head> —
// no extra wiring needed in layout.tsx. This is what makes the browser offer "Add to Home
// Screen" / "Install app", so people can launch it like a native app instead of retyping
// the URL in Chrome every time.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "C-Monitoring — C-Monitoring System",
    short_name: "C-Monitoring",
    description: "Atlantic Grains Inc. C-Monitoring System",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#1d5fd6",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
