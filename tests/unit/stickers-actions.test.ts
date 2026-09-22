import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mirrors Supabase chain: from(table).update(payload).eq(col, val) -> { error }
const fromMock = vi.fn();
const updateMock = vi.fn();
const eqMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: (...args: unknown[]) => fromMock(...args),
  })),
}));

function formData(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  eqMock.mockResolvedValue({ error: null });
  updateMock.mockReturnValue({ eq: eqMock });
  fromMock.mockReturnValue({ update: updateMock });
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "test-secret-key";
});

describe("flagStickerWithState", () => {
  it("returns success and flags with reason", async () => {
    const { flagStickerWithState } = await import(
      "@/app/[locale]/(admin)/stickers/actions"
    );
    const res = await flagStickerWithState(
      { success: false, message: "" },
      formData({ id: "sticker-123", reason: "offensive content" }),
    );
    expect(res).toEqual({
      success: true,
      message: "Stiker ditandai tidak pantas",
    });
    // from() returns { update }, update() returns { eq }, eq() resolves
    expect(fromMock).toHaveBeenCalledWith("sticker_generations");
    expect(updateMock).toHaveBeenCalledOnce();
    const payload = updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      is_flagged: true,
      flag_reason: "offensive content",
    });
    expect(typeof payload.flagged_at).toBe("string");
    expect(eqMock).toHaveBeenCalledWith("id", "sticker-123");
  });

  it("returns success without reason when empty", async () => {
    const { flagStickerWithState } = await import(
      "@/app/[locale]/(admin)/stickers/actions"
    );
    const res = await flagStickerWithState(
      { success: false, message: "" },
      formData({ id: "sticker-123" }),
    );
    expect(res.success).toBe(true);
    const payload = updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.flag_reason).toBeNull();
  });

  it("returns failure when id is missing", async () => {
    const { flagStickerWithState } = await import(
      "@/app/[locale]/(admin)/stickers/actions"
    );
    const res = await flagStickerWithState(
      { success: false, message: "" },
      formData({ id: "" }),
    );
    expect(res.success).toBe(false);
    expect(res.message).toContain("Missing id");
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("returns failure when Supabase errors", async () => {
    eqMock.mockResolvedValue({ error: { message: "db down" } });
    const { flagStickerWithState } = await import(
      "@/app/[locale]/(admin)/stickers/actions"
    );
    const res = await flagStickerWithState(
      { success: false, message: "" },
      formData({ id: "sticker-123", reason: "bad" }),
    );
    expect(res).toEqual({ success: false, message: "db down" });
  });
});

describe("unflagStickerWithState", () => {
  it("returns success and unflags", async () => {
    const { unflagStickerWithState } = await import(
      "@/app/[locale]/(admin)/stickers/actions"
    );
    const res = await unflagStickerWithState(
      { success: false, message: "" },
      formData({ id: "sticker-123" }),
    );
    expect(res).toEqual({
      success: true,
      message: "Tanda tidak pantas dicabut",
    });
    const payload = updateMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toEqual(
      expect.objectContaining({
        is_flagged: false,
        flagged_at: null,
        flag_reason: null,
      }),
    );
  });

  it("returns failure when Supabase errors", async () => {
    eqMock.mockResolvedValue({ error: { message: "db down" } });
    const { unflagStickerWithState } = await import(
      "@/app/[locale]/(admin)/stickers/actions"
    );
    const res = await unflagStickerWithState(
      { success: false, message: "" },
      formData({ id: "sticker-123" }),
    );
    expect(res).toEqual({ success: false, message: "db down" });
  });
});
