import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "לימודא - לימוד יומי",
    short_name: "לימודא",
    description: "אפליקציית לימוד יומי אישית ומדויקת",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1e3a8a",
    dir: "rtl",
    lang: "he",
    icons: [
      {
        src: "/icons/192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/512",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
