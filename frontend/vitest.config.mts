import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Vitest konfigürasyonu - Frontend test ortamı
 *
 * Bu konfigürasyon:
 * - React desteği sağlar
 * - TypeScript desteği sağlar
 * - Path mapping'i destekler (@/ alias'ları)
 * - Test coverage raporları oluşturur
 * - DOM test ortamı sağlar
 */
export default defineConfig({
  plugins: [react()],

  // Test ortamı
  test: {
    // DOM test ortamı (React component'leri için)
    environment: "jsdom",

    // Test dosyalarının konumu
    include: [
      "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],

    // Test dosyalarını hariç tut
    exclude: ["node_modules", "dist", ".next", "coverage"],

    // Global test setup
    setupFiles: ["./test/setup.ts"],

    // Coverage konfigürasyonu
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: [
        "src/**/*.{ts,tsx}",
        "!src/**/*.d.ts",
        "!src/**/*.stories.{ts,tsx}",
        "!src/**/*.test.{ts,tsx}",
        "!src/**/*.spec.{ts,tsx}",
      ],
      exclude: [
        "node_modules/",
        "dist/",
        ".next/",
        "coverage/",
        "**/*.config.{js,ts}",
        "**/types/**",
        "**/constants/**",
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // Test timeout (10 saniye)
    testTimeout: 10000,

    // Global test konfigürasyonu
    globals: true,

    // Verbose output (varsayılan raporlayıcıyı kullan)
  },

  // Path mapping (@/ alias'ları)
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/components": path.resolve(__dirname, "./src/components"),
      "@/lib": path.resolve(__dirname, "./src/lib"),
      "@/hooks": path.resolve(__dirname, "./src/hooks"),
      "@/stores": path.resolve(__dirname, "./src/stores"),
      "@/types": path.resolve(__dirname, "./src/types"),
      "@/test": path.resolve(__dirname, "./test"),
    },
  },

  // CSS ve asset handling
  css: {
    modules: {
      classNameStrategy: "non-scoped",
    },
  },

  // Environment variables
  define: {
    "process.env.NODE_ENV": '"test"',
  },
});
