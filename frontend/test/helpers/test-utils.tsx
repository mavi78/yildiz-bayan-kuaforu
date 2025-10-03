/**
 * Test yardımcı fonksiyonları
 *
 * Bu dosya React component testleri için yardımcı fonksiyonlar sağlar:
 * - Custom render fonksiyonu
 * - Provider wrapper'ları
 * - Test data oluşturucuları
 */

import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

// Test için QueryClient oluştur
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

/**
 * Test için custom render fonksiyonu
 * TanStack Query Provider ile sarar
 */
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  { queryClient = createTestQueryClient(), ...renderOptions }: CustomRenderOptions = {},
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

/**
 * Test için mock data oluşturucuları
 */
export const testData = {
  user: {
    id: "user-123",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    role: "CUSTOMER" as const,
    isActive: true,
  },

  appointment: {
    id: "appointment-123",
    customerId: "customer-123",
    staffId: "staff-123",
    serviceId: "service-123",
    date: "2024-01-15",
    time: "10:00",
    status: "PENDING" as const,
    creationMethod: "ONLINE_GUEST" as const,
    trackingCode: "TEST1234",
    notes: null,
    customer: {
      id: "customer-123",
      firstName: "Test",
      lastName: "Customer",
      phone: "+905551234567",
    },
    service: {
      id: "service-123",
      name: "Saç Kesimi",
      durationMinutes: 60,
      price: 150.0,
    },
    staff: {
      id: "staff-123",
      firstName: "Staff",
      lastName: "User",
    },
  },

  service: {
    id: "service-123",
    name: "Saç Kesimi",
    description: "Kadın saç kesimi hizmeti",
    durationMinutes: 60,
    price: 150.0,
    isActive: true,
  },

  customer: {
    id: "customer-123",
    type: "REGISTERED" as const,
    firstName: "Test",
    lastName: "Customer",
    email: "customer@example.com",
    phone: "+905551234567",
    totalAppointments: 5,
    totalSpent: 750.0,
  },
};

/**
 * Mock API response'ları
 */
export const mockApiResponses = {
  success: {
    success: true,
    message: "İşlem başarılı",
    data: {},
  },

  error: {
    success: false,
    message: "Bir hata oluştu",
    error: "VALIDATION_ERROR",
  },

  appointments: {
    success: true,
    data: [testData.appointment],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    },
  },

  services: {
    success: true,
    data: [testData.service],
  },

  customers: {
    success: true,
    data: [testData.customer],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    },
  },
};

/**
 * Mock fetch fonksiyonu
 */
export function createMockFetch(responses: Record<string, any> = {}) {
  return vi.fn().mockImplementation((url: string) => {
    const response = responses[url] || mockApiResponses.success;

    return Promise.resolve({
      ok: response.success !== false,
      status: response.success !== false ? 200 : 400,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
    });
  });
}

/**
 * Mock localStorage
 */
export function createMockLocalStorage() {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
}

/**
 * Mock sessionStorage
 */
export function createMockSessionStorage() {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
}

/**
 * Mock router (Next.js)
 */
export function createMockRouter() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    pathname: "/",
    query: {},
    asPath: "/",
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  };
}

/**
 * Mock useRouter hook
 */
export function mockUseRouter(router = createMockRouter()) {
  vi.mock("next/navigation", () => ({
    useRouter: () => router,
    usePathname: () => router.pathname,
    useSearchParams: () => new URLSearchParams(router.query as Record<string, string>),
  }));
}

/**
 * Test için rastgele veri oluşturucuları
 */
export function createRandomString(length: number = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function createRandomEmail(): string {
  return `${createRandomString(8)}@test.com`;
}

export function createRandomPhone(): string {
  return `+90555${Math.floor(Math.random() * 10000000)
    .toString()
    .padStart(7, "0")}`;
}

/**
 * Test için tarih yardımcı fonksiyonları
 */
export function getTomorrow(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

export function getNextWeek(): string {
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  return nextWeek.toISOString().split("T")[0];
}

/**
 * Test için form data oluşturucuları
 */
export const testFormData = {
  appointment: {
    serviceId: "service-123",
    date: getTomorrow(),
    time: "10:00",
    notes: "Test randevu notu",
  },

  customer: {
    firstName: "Test",
    lastName: "Customer",
    email: "customer@test.com",
    phone: "+905551234567",
  },

  login: {
    email: "test@example.com",
    password: "password123",
  },
};

/**
 * Test için mock event'ler
 */
export function createMockEvent(type: string, value?: any) {
  return {
    target: {
      value: value || "",
      name: type,
    },
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
}

/**
 * Test için mock click event'i
 */
export function createMockClickEvent() {
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
}

// Re-export everything from @testing-library/react
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
