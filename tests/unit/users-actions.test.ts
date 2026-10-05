import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const updateUserByIdMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      admin: {
        updateUserById: updateUserByIdMock,
      },
    },
  })),
}));

let mockAdminUser: { id: string; email: string } = {
  id: "admin-123",
  email: "admin@example.com",
};

vi.mock("@/lib/supabase/auth-guard", () => ({
  requireAdmin: vi.fn(async () => mockAdminUser),
}));

function formData(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  updateUserByIdMock.mockResolvedValue({ error: null });
  mockAdminUser = { id: "admin-123", email: "admin@example.com" };
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "test-secret";
});

describe("suspendUser", () => {
  it("successfully suspends a target user", async () => {
    const { suspendUser } = await import("@/app/[locale]/(admin)/users/[id]/actions");
    const res = await suspendUser(
      { success: false, message: "" },
      formData({ id: "target-user-456", reason: "Spamming" }),
    );
    expect(res).toEqual({ success: true, message: "Pengguna berhasil disuspend" });
    expect(updateUserByIdMock).toHaveBeenCalledWith(
      "target-user-456",
      expect.objectContaining({
        ban_duration: "87600h",
        user_metadata: { suspend_reason: "Spamming" },
      }),
    );
  });

  it("prevents admin from suspending their own account", async () => {
    const { suspendUser } = await import("@/app/[locale]/(admin)/users/[id]/actions");
    const res = await suspendUser(
      { success: false, message: "" },
      formData({ id: "admin-123", reason: "Test self" }),
    );
    expect(res.success).toBe(false);
    expect(res.message).toContain("Tidak dapat men-suspend akun sendiri");
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it("fails when id is missing", async () => {
    const { suspendUser } = await import("@/app/[locale]/(admin)/users/[id]/actions");
    const res = await suspendUser(
      { success: false, message: "" },
      formData({ id: "" }),
    );
    expect(res.success).toBe(false);
    expect(res.message).toContain("Missing id");
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });
});

describe("unsuspendUser", () => {
  it("successfully unsuspends a user", async () => {
    const { unsuspendUser } = await import("@/app/[locale]/(admin)/users/[id]/actions");
    const res = await unsuspendUser(
      { success: false, message: "" },
      formData({ id: "target-user-456" }),
    );
    expect(res).toEqual({ success: true, message: "Suspend dicabut, pengguna aktif kembali" });
    expect(updateUserByIdMock).toHaveBeenCalledWith(
      "target-user-456",
      expect.objectContaining({
        ban_duration: "none",
      }),
    );
  });

  it("fails when id is missing", async () => {
    const { unsuspendUser } = await import("@/app/[locale]/(admin)/users/[id]/actions");
    const res = await unsuspendUser(
      { success: false, message: "" },
      formData({ id: "" }),
    );
    expect(res.success).toBe(false);
    expect(res.message).toContain("Missing id");
  });
});
