import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

async function loadIsAdminEmail() {
  vi.resetModules();
  const mod = await import("@/env");
  return mod.isAdminEmail;
}

beforeEach(() => {
  // Full valid env so parsing succeeds and behavior is deterministic.
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "test-publishable-key-1234567890";
  process.env.SUPABASE_SECRET_KEY = "test-secret-key-1234567890";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("isAdminEmail", () => {
  it("is case-insensitive and trims entries", async () => {
    process.env.ADMIN_EMAILS = " Alam.Aby.B@Gmail.com , other@example.com";
    const isAdminEmail = await loadIsAdminEmail();
    expect(isAdminEmail("alam.aby.b@gmail.com")).toBe(true);
    expect(isAdminEmail("  other@example.com ")).toBe(true);
  });

  it("rejects non-admin emails", async () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    const isAdminEmail = await loadIsAdminEmail();
    expect(isAdminEmail("user@example.com")).toBe(false);
  });

  it("returns false for empty or missing email", async () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    const isAdminEmail = await loadIsAdminEmail();
    expect(isAdminEmail("")).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
  });

  it("returns false when ADMIN_EMAILS is empty", async () => {
    process.env.ADMIN_EMAILS = "";
    const isAdminEmail = await loadIsAdminEmail();
    expect(isAdminEmail("admin@example.com")).toBe(false);
  });
});
