import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ask Magic Mike Lead Center",
    short_name: "Magic Mike",
    description: "Secure lead alerts and real estate lead operations for Our Town Properties.",
    start_url: "/admin/notifications/phone",
    display: "standalone",
    background_color: "#090909",
    theme_color: "#d4a72c",
    icons: [
      { src: "/images/ask-magic-mike/brand-pack-v2/mike-avatar-circle-128.png", sizes: "128x128", type: "image/png" },
      { src: "/images/ask-magic-mike/brand-pack-v2/mike-avatar-circle-256.png", sizes: "256x256", type: "image/png" },
    ],
  };
}
