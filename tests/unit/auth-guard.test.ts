import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: getUserMock,
    },
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "test-secret";
  process.env.ADMIN_EMAILS = "admin@example.com,super@example.com";
});

describe("requireAdmin auth guard", () => {
  it("returns user when caller is an authenticated admin", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "admin@example.com" } },
      error: null,
    });
    const { requireAdmin } = await import("@/lib/supabase/auth-guard");
    const user = await requireAdmin();
    expect(user).toEqual({ id: "user-1", email: "admin@example.com" });
  });

  it("throws error when session is missing / user is null", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const { requireAdmin } = await import("@/lib/supabase/auth-guard");
    await expect(requireAdmin()).rejects.toThrow("Unauthorized");
  });

  it("throws error when supabase auth returns error", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { message: "JWT expired" },
    });
    const { requireAdmin } = await import("@/lib/supabase/auth-guard");
    await expect(requireAdmin()).rejects.toThrow("Unauthorized");
  });

  it("throws error when caller email is not in admin whitelist", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-2", email: "stranger@gmail.com" } },
      error: null,
    });
    const { requireAdmin } = await import("@/lib/supabase/auth-guard");
    await expect(requireAdmin()).rejects.toThrow("Forbidden");
  });
});
