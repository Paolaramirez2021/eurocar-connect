import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.dcf9834fd500452390e51341d8f8d81c',
  appName: 'eurocar-connect',
  webDir: 'dist',
  server: {
    url: 'https://dcf9834f-d500-4523-90e5-1341d8f8d81c.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      ios: {
        presentationStyle: 'fullscreen'
      }
    }
  }
};

export default config;
