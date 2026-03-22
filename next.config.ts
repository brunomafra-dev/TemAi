import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
