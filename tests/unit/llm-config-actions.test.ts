import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const updateMock = vi.fn();
let capturedUpdate: Record<string, unknown> | null = null;

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: (payload: Record<string, unknown>) => {
        capturedUpdate = payload;
        return { eq: vi.fn(() => updateMock()) };
      },
    })),
  })),
}));

function formData(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

const VALID = {
  id: "cfg-1",
  provider_name: "pixazo",
  route_scope: "default",
  model_name: "flux-1-schnell",
  base_url: "https://example.com",
  label: "Pixazo",
  priority: "2",
  timeout_ms: "90000",
  fallback_policy: "always",
  is_active: "on",
  notes: "n",
  request_options: '{"temperature":0.7}',
  api_key: "secret-key",
};

beforeEach(() => {
  vi.clearAllMocks();
  capturedUpdate = null;
  updateMock.mockResolvedValue({ error: null });
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "test-secret-key";
});

describe("updateLlmConfigWithState", () => {
  it("returns success and maps the payload", async () => {
    const { updateLlmConfigWithState } = await import("@/app/[locale]/(admin)/llm-config/actions");
    const res = await updateLlmConfigWithState({ success: false, message: "" }, formData(VALID));
    expect(res).toEqual({ success: true, message: "Konfigurasi berhasil disimpan" });
    expect(updateMock).toHaveBeenCalled();
  });

  it("rejects invalid route_scope", async () => {
    const { updateLlmConfigWithState } = await import("@/app/[locale]/(admin)/llm-config/actions");
    const res = await updateLlmConfigWithState({ success: false, message: "" }, formData({ ...VALID, route_scope: "nope" }));
    expect(res).toEqual({ success: false, message: "Invalid route_scope" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects invalid fallback_policy", async () => {
    const { updateLlmConfigWithState } = await import("@/app/[locale]/(admin)/llm-config/actions");
    const res = await updateLlmConfigWithState({ success: false, message: "" }, formData({ ...VALID, fallback_policy: "maybe" }));
    expect(res).toEqual({ success: false, message: "Invalid fallback_policy" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects malformed request_options JSON", async () => {
    const { updateLlmConfigWithState } = await import("@/app/[locale]/(admin)/llm-config/actions");
    const res = await updateLlmConfigWithState({ success: false, message: "" }, formData({ ...VALID, request_options: "{nope" }));
    expect(res).toEqual({ success: false, message: "request_options must be valid JSON" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("requires an id", async () => {
    const { updateLlmConfigWithState } = await import("@/app/[locale]/(admin)/llm-config/actions");
    const res = await updateLlmConfigWithState({ success: false, message: "" }, formData({ ...VALID, id: "" }));
    expect(res).toEqual({ success: false, message: "Missing id" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("surfaces Supabase errors", async () => {
    updateMock.mockResolvedValue({ error: { message: "db down" } });
    const { updateLlmConfigWithState } = await import("@/app/[locale]/(admin)/llm-config/actions");
    const res = await updateLlmConfigWithState({ success: false, message: "" }, formData(VALID));
    expect(res).toEqual({ success: false, message: "db down" });
  });

  it("omits empty api_key so the stored key is never blanked", async () => {
    const { updateLlmConfigWithState } = await import("@/app/[locale]/(admin)/llm-config/actions");
    const res = await updateLlmConfigWithState({ success: false, message: "" }, formData({ ...VALID, api_key: "   " }));
    expect(res.success).toBe(true);
    expect(capturedUpdate).not.toBeNull();
    expect("api_key" in (capturedUpdate ?? {})).toBe(false);
  });

  it("accepts checkbox 'true' for is_active", async () => {
    const { updateLlmConfigWithState } = await import("@/app/[locale]/(admin)/llm-config/actions");
    const res = await updateLlmConfigWithState({ success: false, message: "" }, formData({ ...VALID, is_active: "true" }));
    expect(res.success).toBe(true);
    expect((capturedUpdate ?? {}).is_active).toBe(true);
  });
});
