import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "assets/eurocar_logo.png",
        "favicon.ico",
        "robots.txt"
      ],
      manifest: {
        name: "EuroCar Connect",
        short_name: "EuroCar",
        description: "Sistema profesional de gestión para alquiler de vehículos - Control total de flotas, mantenimientos, alquileres y finanzas",
        theme_color: "#1e40af",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "any",
        scope: "/",
        start_url: "/",
        lang: "es",
        categories: ["business", "productivity", "utilities"],
        prefer_related_applications: false,
        icons: [
          {
            src: "/assets/pwa-icon.png",
            sizes: "48x48",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/assets/pwa-icon.png",
            sizes: "72x72",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/assets/pwa-icon.png",
            sizes: "96x96",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/assets/pwa-icon.png",
            sizes: "144x144",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/assets/pwa-icon.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/assets/pwa-icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/assets/pwa-icon.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "/assets/pwa-icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          },
        ],
        screenshots: [
          {
            src: "/assets/eurocar_logo.png",
            sizes: "512x512",
            type: "image/png",
            form_factor: "wide",
            label: "EuroCar Dashboard"
          }
        ],
        shortcuts: [
          {
            name: "Nueva Reserva",
            short_name: "Reserva",
            description: "Crear una nueva reserva",
            url: "/reservations?tab=nueva",
            icons: [{ src: "/assets/eurocar_logo.png", sizes: "96x96" }]
          },
          {
            name: "Vehículos",
            short_name: "Vehículos",
            description: "Ver flota de vehículos",
            url: "/vehicles",
            icons: [{ src: "/assets/eurocar_logo.png", sizes: "96x96" }]
          },
          {
            name: "Clientes",
            short_name: "Clientes",
            description: "Gestionar clientes",
            url: "/customers",
            icons: [{ src: "/assets/eurocar_logo.png", sizes: "96x96" }]
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2,webp,jpg,jpeg}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          }
        ],
      },
      devOptions: {
        enabled: false
      }
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          'react-query': ['@tanstack/react-query'],
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-select',
            '@radix-ui/react-checkbox'
          ],
          'form-libs': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'date-libs': ['date-fns', 'react-day-picker'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false
  }
}));
