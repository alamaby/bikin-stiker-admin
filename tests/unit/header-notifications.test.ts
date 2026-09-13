import { beforeEach, describe, expect, it, vi } from "vitest";

// next-intl server rejects the node environment; stub the translator with real id.json values.
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale }: { locale: string }) => {
    const dict = locale === "en" ? enDict : idDict;
    return (key: string) => dict[key] ?? key;
  },
}));

const idDict: Record<string, string> = {
  failedSummary: "generasi gagal",
  failedSummaryDetail: "dalam 24 jam terakhir",
  summary: "ringkasan",
  minutesAgo: "mnt lalu",
  hoursAgo: "jam lalu",
  daysAgo: "hari lalu",
};

const enDict: Record<string, string> = {
  failedSummary: "failed generations",
  failedSummaryDetail: "in the last 24 hours",
  summary: "summary",
  minutesAgo: "min ago",
  hoursAgo: "hr ago",
  daysAgo: "days ago",
};

// Mock the dynamic supabase-js import used inside getHeaderNotifications.
const fromMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: fromMock,
  })),
}));

function chainableCountResult(count: number | null) {
  // Supports: .select(...).eq(...).gte(...) with await resolving to { count }
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (resolve: (v: unknown) => void) => Promise.resolve({ count }).then(resolve),
  };
  return builder;
}

function chainableRowsResult(rows: unknown[]) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (resolve: (v: unknown) => void) => Promise.resolve({ data: rows, error: null }).then(resolve),
  };
  return builder;
}

async function loadGetHeaderNotifications() {
  vi.resetModules();
  const mod = await import("@/lib/header-notifications");
  return mod.getHeaderNotifications;
}

beforeEach(() => {
  fromMock.mockReset();
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "test-service-key";
});

describe("getHeaderNotifications", () => {
  it("returns [] when Supabase env is missing", async () => {
    delete process.env.SUPABASE_URL;
    const getHeaderNotifications = await loadGetHeaderNotifications();
    expect(await getHeaderNotifications("id")).toEqual([]);
  });

  it("returns [] when Supabase query fails instead of crashing the header", async () => {
    fromMock.mockImplementation(() => {
      throw new Error("boom");
    });
    const getHeaderNotifications = await loadGetHeaderNotifications();
    expect(await getHeaderNotifications("id")).toEqual([]);
  });

  it("builds a summary plus recent failed items", async () => {
    fromMock.mockImplementation(() => {
      // First call: count query; second call: recent rows query.
      if (fromMock.mock.calls.length === 1) {
        return chainableCountResult(3);
      }
      return chainableRowsResult([
        { id: "a1", provider_name: "pixazo", model_name: "flux-1-schnell", error_message: "x".repeat(100), created_at: "2026-09-13T11:00:00Z" },
        { id: "a2", provider_name: "gemini", model_name: "gemini-pro", error_message: null, created_at: "2026-09-13T10:30:00Z" },
      ]);
    });
    const getHeaderNotifications = await loadGetHeaderNotifications();
    const items = await getHeaderNotifications("id");
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ id: "failed-24h", tone: "error" });
    expect(items[0].title).toContain("3");
    expect(items[1].id).toBe("a1");
    expect(items[1].detail).toHaveLength(80);
    expect(items[2].title).toContain("gemini");
  });

  it("caps items at 6", async () => {
    fromMock.mockImplementation(() => {
      if (fromMock.mock.calls.length === 1) {
        return chainableCountResult(10);
      }
      const rows = Array.from({ length: 5 }, (_, i) => ({
        id: `id-${i}`,
        provider_name: "p",
        model_name: "m",
        error_message: "e",
        created_at: "2026-09-13T11:00:00Z",
      }));
      return chainableRowsResult(rows);
    });
    const getHeaderNotifications = await loadGetHeaderNotifications();
    const items = await getHeaderNotifications("id");
    expect(items).toHaveLength(6);
  });

  it("no summary and empty list when there are no failures", async () => {
    fromMock.mockImplementation(() => {
      if (fromMock.mock.calls.length === 1) {
        return chainableCountResult(0);
      }
      return chainableRowsResult([]);
    });
    const getHeaderNotifications = await loadGetHeaderNotifications();
    const items = await getHeaderNotifications("id");
    expect(items).toEqual([]);
  });
});
