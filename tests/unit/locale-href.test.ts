import { describe, expect, it } from "vitest";
import { buildLocaleHref, isActivePath, stripLocale } from "@/lib/locale-href";

describe("stripLocale", () => {
  it("strips the locale prefix", () => {
    expect(stripLocale("/id/users")).toBe("/users");
    expect(stripLocale("/en/llm-config")).toBe("/llm-config");
  });

  it("returns / for the bare locale", () => {
    expect(stripLocale("/id")).toBe("/");
    expect(stripLocale("/en/")).toBe("/");
  });

  it("keeps deep paths", () => {
    expect(stripLocale("/id/presets/kawaii")).toBe("/presets/kawaii");
  });

  it("returns the input when there is no locale prefix", () => {
    expect(stripLocale("/users")).toBe("/users");
    expect(stripLocale("/")).toBe("/");
  });
});

describe("buildLocaleHref", () => {
  it("prefixes the locale", () => {
    expect(buildLocaleHref("id", "/users")).toBe("/id/users");
    expect(buildLocaleHref("en", "/presets/kawaii")).toBe("/en/presets/kawaii");
  });

  it("omits the trailing locale for root", () => {
    expect(buildLocaleHref("id", "/")).toBe("/id");
    expect(buildLocaleHref("en", "/")).toBe("/en");
  });

  it("adds the leading slash when missing", () => {
    expect(buildLocaleHref("id", "users")).toBe("/id/users");
  });
});

describe("isActivePath", () => {
  it("matches exact paths within the same locale", () => {
    expect(isActivePath("/id/users", "id", "/id/users")).toBe(true);
    expect(isActivePath("/en/users", "en", "/users")).toBe(true);
  });

  it("matches nested paths", () => {
    expect(isActivePath("/id/presets/kawaii", "id", "/presets")).toBe(true);
  });

  it("matches the root only exactly", () => {
    expect(isActivePath("/id", "id", "/")).toBe(true);
    expect(isActivePath("/id/users", "id", "/")).toBe(false);
  });

  it("does not cross locales", () => {
    expect(isActivePath("/id/users", "id", "/en/users")).toBe(false);
  });

  it("does not match unrelated paths", () => {
    expect(isActivePath("/id/users", "id", "/presets")).toBe(false);
  });
});
