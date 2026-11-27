import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ru.pixelfront.game',
  appName: 'Пиксельный фронт',
  webDir: 'dist',
  android: {
    backgroundColor: '#0a0f1d',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
