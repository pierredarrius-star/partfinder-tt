import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.vercel.partfindertt',
  appName: 'PartFinder TT',
  // webDir is unused at runtime when server.url is set — Capacitor loads the
  // live Vercel deployment instead of a local static bundle. This keeps all
  // /api/* routes running on Vercel and means the app picks up every deploy
  // automatically without a new native build.
  webDir: 'out',
  server: {
    url: 'https://partfinder-tt.vercel.app',
    androidScheme: 'https',
  },
};

export default config;
