import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Chainable Supabase stub: .from() -> table builder whose terminal method
// resolves { error: null } (or a configured error).
const terminalMocks = {
  upsert: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: terminalMocks.upsert,
      delete: () => ({ eq: vi.fn(() => terminalMocks.delete()) }),
      update: () => ({ eq: vi.fn(() => terminalMocks.update()) }),
    })),
  })),
}));

function formData(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

const VALID = {
  id: "kawaii",
  label: "Kawaii",
  description: "Cute",
  emoji: "🎨",
  style_descriptor: "kawaii cute pastel",
  reasoning_guidance: "keep pastel",
  required_role: "free",
  sort_order: "10",
  is_active: "on",
  cost_override: "2",
  valid_from: "2026-09-01T00:00",
  valid_until: "2026-10-01T00:00",
};

beforeEach(() => {
  vi.clearAllMocks();
  terminalMocks.upsert.mockResolvedValue({ error: null });
  terminalMocks.delete.mockResolvedValue({ error: null });
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "test-secret-key";
});

describe("upsertPresetWithState", () => {
  it("returns success on valid input and maps the payload", async () => {
    const { upsertPresetWithState } = await import("@/app/[locale]/(admin)/presets/actions");
    const res = await upsertPresetWithState({ success: false, message: "" }, formData(VALID));
    expect(res).toEqual({ success: true, message: "Preset berhasil disimpan" });
    const payload = terminalMocks.upsert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      id: "kawaii",
      label: "Kawaii",
      emoji: "🎨",
      required_role: "free",
      sort_order: 10,
      is_active: true,
      cost_override: 2,
    });
    expect(typeof payload.valid_from).toBe("string");
    expect(typeof payload.valid_until).toBe("string");
    expect(typeof payload.updated_at).toBe("string");
  });

  it("nulls optional empties and falls back non-numeric sort_order to 100", async () => {
    const { upsertPresetWithState } = await import("@/app/[locale]/(admin)/presets/actions");
    const res = await upsertPresetWithState(
      { success: false, message: "" },
      formData({ id: "x", label: "X", style_descriptor: "s", sort_order: "abc" }),
    );
    expect(res.success).toBe(true);
    const payload = terminalMocks.upsert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.emoji).toBeNull();
    expect(payload.reasoning_guidance).toBeNull();
    expect(payload.sort_order).toBe(100);
    expect(payload.is_active).toBe(false);
    expect(payload.cost_override).toBeNull();
    expect(payload.valid_from).toBeNull();
  });

  it("returns failure when required fields are missing", async () => {
    const { upsertPresetWithState } = await import("@/app/[locale]/(admin)/presets/actions");
    const res = await upsertPresetWithState({ success: false, message: "" }, formData({ id: "", label: "", style_descriptor: "" }));
    expect(res.success).toBe(false);
    expect(res.message).toContain("Missing required fields");
    expect(terminalMocks.upsert).not.toHaveBeenCalled();
  });

  it("returns failure when Supabase errors", async () => {
    terminalMocks.upsert.mockResolvedValue({ error: { message: "db down" } });
    const { upsertPresetWithState } = await import("@/app/[locale]/(admin)/presets/actions");
    const res = await upsertPresetWithState({ success: false, message: "" }, formData(VALID));
    expect(res).toEqual({ success: false, message: "db down" });
  });
});

describe("deletePresetWithState", () => {
  it("returns success and reports the id", async () => {
    const { deletePresetWithState } = await import("@/app/[locale]/(admin)/presets/actions");
    const res = await deletePresetWithState({ success: false, message: "" }, formData({ id: "kawaii" }));
    expect(res).toEqual({ success: true, message: 'Preset "kawaii" dihapus' });
    expect(terminalMocks.delete).toHaveBeenCalled();
  });

  it("returns failure when id is missing", async () => {
    const { deletePresetWithState } = await import("@/app/[locale]/(admin)/presets/actions");
    const res = await deletePresetWithState({ success: false, message: "" }, formData({ id: "" }));
    expect(res.success).toBe(false);
    expect(res.message).toContain("Missing id");
  });
});
