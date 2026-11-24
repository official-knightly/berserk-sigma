import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.officialknightly.chesstopper",
  appName: "Chess Topper",
  webDir: ".output/public",
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
  server: {
    androidScheme: "https",
    cleartext: false,
  },
};

export default config;
