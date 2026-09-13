import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- Fake nextUrl: a real URL instance extended with clone() ----
function fakeNextUrl(pathname: string, base = "http://localhost") {
  const u = new URL(pathname, base);
  return Object.assign(u, {
    clone() {
      return fakeNextUrl(u.pathname + u.search, base);
    },
  });
}

type FakeRequest = {
  nextUrl: ReturnType<typeof fakeNextUrl>;
  headers: { get: (name: string) => string | null };
  cookies: { getAll: () => { name: string; value: string }[] };
};

function makeRequest(pathname: string, opts?: { acceptLanguage?: string }): FakeRequest {
  return {
    nextUrl: fakeNextUrl(pathname),
    headers: { get: (name: string) => (name === "accept-language" ? (opts?.acceptLanguage ?? "") : null) },
    cookies: { getAll: () => [] },
  };
}

// ---- Mocks ----
const updateSessionMock = vi.fn(async () => ({ __kind: "next" as const }));

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: () => updateSessionMock(),
}));

let mockUser: { email?: string } | null = null;

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: async () => ({ data: { user: mockUser } }),
    },
  })),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    next: () => ({ __kind: "next" as const }),
    redirect: (url: URL) => ({ __kind: "redirect" as const, url }),
  },
}));

type MwResponse = { __kind: "next" } | { __kind: "redirect"; url: URL };

async function runMiddleware(pathname: string, opts?: { acceptLanguage?: string }) {
  const { middleware } = await import("@/../middleware");
  const req = makeRequest(pathname, opts);
  return (await middleware(req as never)) as unknown as MwResponse;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  mockUser = null;
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
  process.env.NEXT_PUBLIC_ADMIN_EMAILS = "admin@example.com";
  delete process.env.ADMIN_EMAILS;
});

describe("middleware locale routing", () => {
  it("redirects a locale-less path to the default locale", async () => {
    mockUser = { email: "admin@example.com" };
    const res = await runMiddleware("/users");
    expect(res.__kind).toBe("redirect");
    if (res.__kind === "redirect") expect(res.url.pathname).toBe("/id/users");
  });

  it("honours English accept-language on locale-less paths", async () => {
    mockUser = { email: "admin@example.com" };
    const res = await runMiddleware("/users", { acceptLanguage: "en-US,en;q=0.9" });
    expect(res.__kind).toBe("redirect");
    if (res.__kind === "redirect") expect(res.url.pathname).toBe("/en/users");
  });

  it("redirects / to the default locale", async () => {
    const res = await runMiddleware("/");
    expect(res.__kind).toBe("redirect");
    if (res.__kind === "redirect") expect(res.url.pathname).toBe("/id");
  });

  it("passes static assets through", async () => {
    mockUser = { email: "admin@example.com" };
    const res = await runMiddleware("/favicon.png");
    expect(res.__kind).toBe("next");
  });
});

describe("middleware auth gate", () => {
  it("redirects guests to login with a next param", async () => {
    mockUser = null;
    const res = await runMiddleware("/id/users");
    expect(res.__kind).toBe("redirect");
    if (res.__kind === "redirect") {
      expect(res.url.pathname).toBe("/id/login");
      expect(res.url.searchParams.get("next")).toBe("/id/users");
    }
  });

  it("redirects non-admin users to unauthorized", async () => {
    mockUser = { email: "stranger@example.com" };
    const res = await runMiddleware("/id/users");
    expect(res.__kind).toBe("redirect");
    if (res.__kind === "redirect") expect(res.url.pathname).toBe("/id/unauthorized");
  });

  it("lets admin users through", async () => {
    mockUser = { email: "Admin@Example.com" };
    const res = await runMiddleware("/id/users");
    expect(res.__kind).toBe("next");
  });

  it("skips login and unauthorized pages", async () => {
    mockUser = null;
    expect((await runMiddleware("/id/login")).__kind).toBe("next");
    expect((await runMiddleware("/id/unauthorized")).__kind).toBe("next");
  });
});
