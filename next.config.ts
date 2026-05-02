import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/downloads/:path*.apk",
        headers: [
          {
            key: "Content-Type",
            value: "application/vnd.android.package-archive",
          },
          {
            key: "Content-Disposition",
            value: 'attachment; filename="temai.apk"',
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "www.receiteria.com.br" },
      { protocol: "https", hostname: "static.itdg.com.br" },
      { protocol: "https", hostname: "www.tudogostoso.com.br" },
      { protocol: "https", hostname: "s2-receitas.glbimg.com" },
      { protocol: "https", hostname: "s2.glbimg.com" },
      { protocol: "https", hostname: "img.itdg.com.br" },
      { protocol: "https", hostname: "www.themealdb.com" },
    ],
  },
};

export default nextConfig;
