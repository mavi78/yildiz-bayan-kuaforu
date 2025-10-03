/**
 * Frontend test mock yardımcı fonksiyonları
 *
 * Bu dosya frontend test sırasında kullanılacak mock'ları sağlar:
 * - API mock'ları
 * - Hook mock'ları
 * - Store mock'ları
 * - External library mock'ları
 */

import { vi } from "vitest";

/**
 * Mock API client
 */
export function createMockApiClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
  };
}

/**
 * Mock Zustand store
 */
export function createMockStore<T>(initialState: T) {
  return {
    ...initialState,
    setState: vi.fn(),
    getState: vi.fn(() => initialState),
    subscribe: vi.fn(),
    destroy: vi.fn(),
  };
}

/**
 * Mock auth store
 */
export function createMockAuthStore() {
  return createMockStore({
    user: null,
    token: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
    setUser: vi.fn(),
    setToken: vi.fn(),
  });
}

/**
 * Mock appointments store
 */
export function createMockAppointmentsStore() {
  return createMockStore({
    appointments: [],
    loading: false,
    error: null,
    setAppointments: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    addAppointment: vi.fn(),
    updateAppointment: vi.fn(),
    removeAppointment: vi.fn(),
  });
}

/**
 * Mock UI store
 */
export function createMockUiStore() {
  return createMockStore({
    modals: {},
    drawers: {},
    notifications: [],
    setModal: vi.fn(),
    setDrawer: vi.fn(),
    addNotification: vi.fn(),
    removeNotification: vi.fn(),
  });
}

/**
 * Mock TanStack Query hooks
 */
export function createMockQueryHooks() {
  return {
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useQueryClient: vi.fn(),
    useInfiniteQuery: vi.fn(),
  };
}

/**
 * Mock React Hook Form
 */
export function createMockForm() {
  return {
    register: vi.fn(),
    handleSubmit: vi.fn(),
    formState: {
      errors: {},
      isSubmitting: false,
      isValid: true,
      isDirty: false,
      isSubmitted: false,
    },
    watch: vi.fn(),
    setValue: vi.fn(),
    getValues: vi.fn(),
    reset: vi.fn(),
    clearErrors: vi.fn(),
    setError: vi.fn(),
  };
}

/**
 * Mock Socket.io client
 */
export function createMockSocket() {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    connected: true,
    id: "socket-123",
  };
}

/**
 * Mock Next.js router
 */
export function createMockNextRouter() {
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
 * Mock window.location
 */
export function createMockLocation() {
  return {
    href: "http://localhost:3000",
    origin: "http://localhost:3000",
    protocol: "http:",
    host: "localhost:3000",
    hostname: "localhost",
    port: "3000",
    pathname: "/",
    search: "",
    hash: "",
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  };
}

/**
 * Mock window.history
 */
export function createMockHistory() {
  return {
    pushState: vi.fn(),
    replaceState: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    length: 1,
    state: null,
  };
}

/**
 * Mock IntersectionObserver
 */
export function createMockIntersectionObserver() {
  return vi.fn().mockImplementation((callback, options) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: options?.root || null,
    rootMargin: options?.rootMargin || "0px",
    thresholds: options?.thresholds || [0],
  }));
}

/**
 * Mock ResizeObserver
 */
export function createMockResizeObserver() {
  return vi.fn().mockImplementation(callback => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
}

/**
 * Mock matchMedia
 */
export function createMockMatchMedia(matches: boolean = false) {
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

/**
 * Mock fetch
 */
export function createMockFetch(responses: Record<string, any> = {}) {
  return vi.fn().mockImplementation((url: string, options?: RequestInit) => {
    const response = responses[url] || { success: true, data: {} };

    return Promise.resolve({
      ok: response.success !== false,
      status: response.success !== false ? 200 : 400,
      statusText: response.success !== false ? "OK" : "Bad Request",
      headers: new Headers({
        "Content-Type": "application/json",
      }),
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
      blob: () => Promise.resolve(new Blob([JSON.stringify(response)])),
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
    length: Object.keys(store).length,
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
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
    length: Object.keys(store).length,
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
}

/**
 * Mock URL.createObjectURL
 */
export function createMockURL() {
  return {
    createObjectURL: vi.fn(() => "mock-object-url"),
    revokeObjectURL: vi.fn(),
  };
}

/**
 * Mock window.scrollTo
 */
export function createMockScrollTo() {
  return vi.fn();
}

/**
 * Mock window.getComputedStyle
 */
export function createMockGetComputedStyle() {
  return vi.fn(() => ({
    getPropertyValue: vi.fn(() => ""),
    setProperty: vi.fn(),
    removeProperty: vi.fn(),
  }));
}

/**
 * Tüm mock'ları temizler
 */
export function clearAllMocks() {
  vi.clearAllMocks();
  vi.resetAllMocks();
}

/**
 * Mock'ları restore eder
 */
export function restoreAllMocks() {
  vi.restoreAllMocks();
}

/**
 * Test için mock data oluşturucuları
 */
export const mockData = {
  user: {
    id: "user-123",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    role: "CUSTOMER",
    isActive: true,
  },

  appointment: {
    id: "appointment-123",
    customerId: "customer-123",
    staffId: "staff-123",
    serviceId: "service-123",
    date: "2024-01-15",
    time: "10:00",
    status: "PENDING",
    creationMethod: "ONLINE_GUEST",
    trackingCode: "TEST1234",
    notes: null,
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
    type: "REGISTERED",
    firstName: "Test",
    lastName: "Customer",
    email: "customer@example.com",
    phone: "+905551234567",
    totalAppointments: 5,
    totalSpent: 750.0,
  },
};

/**
 * Test için mock API response'ları
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
    data: [mockData.appointment],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    },
  },

  services: {
    success: true,
    data: [mockData.service],
  },

  customers: {
    success: true,
    data: [mockData.customer],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    },
  },
};
