/**
 * Vitest test setup dosyası
 *
 * Bu dosya tüm testlerden önce çalışır ve:
 * - Global test konfigürasyonu sağlar
 * - Testing Library matchers'ları ekler
 * - Mock'ları ayarlar
 * - Test ortamını hazırlar
 */

import "@testing-library/jest-dom";
import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// Testing Library matchers'larını ekle
expect.extend(matchers);

// Her test sonrası temizlik
afterEach(() => {
  cleanup();
});

// Console.log'ları test sırasında gizle (isteğe bağlı)
if (process.env.NODE_ENV === "test") {
  // console.log = vi.fn();
  // console.warn = vi.fn();
  // console.error = vi.fn();
}

// Global mock'lar
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// IntersectionObserver mock'u
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// MatchMedia mock'u
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// LocalStorage mock'u
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// SessionStorage mock'u
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
});

// Fetch mock'u
global.fetch = vi.fn();

// URL.createObjectURL mock'u
global.URL.createObjectURL = vi.fn(() => "mock-url");
global.URL.revokeObjectURL = vi.fn();

// Window.scrollTo mock'u
Object.defineProperty(window, "scrollTo", {
  value: vi.fn(),
  writable: true,
});

// Window.getComputedStyle mock'u
Object.defineProperty(window, "getComputedStyle", {
  value: vi.fn(() => ({
    getPropertyValue: vi.fn(),
  })),
});

// Test ortamı değişkenleri
process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001/api";
process.env.NEXT_PUBLIC_WS_URL = "ws://localhost:3001";
