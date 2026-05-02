import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mafralabs.temai",
  appName: "TemAi",
  webDir: "public",
  server: {
    url: "https://temaiapp.vercel.app",
    cleartext: false,
    androidScheme: "https",
  },
};

export default config;
