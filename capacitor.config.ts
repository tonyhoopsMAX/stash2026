import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stash.app',
  appName: 'STASH',
  webDir: 'dist/native-web',
  server: {
    // Serve the bundled static app over https on the WebView, which keeps
    // IndexedDB reliable and avoids mixed-content warnings. This is local-only;
    // there is no remote server and no data leaves the device.
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#061112',
  },
};

export default config;
