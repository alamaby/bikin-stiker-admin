import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";

function setWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
  act(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

afterEach(() => {
  setWidth(1440);
});

describe("SidebarContext", () => {
  it("toggles the desktop sidebar", () => {
    const { result } = renderHook(() => useSidebar(), { wrapper: SidebarProvider });
    expect(result.current.isExpanded).toBe(true);
    act(() => result.current.toggleSidebar());
    expect(result.current.isExpanded).toBe(false);
  });

  it("toggles the mobile drawer", () => {
    const { result } = renderHook(() => useSidebar(), { wrapper: SidebarProvider });
    act(() => result.current.toggleMobileSidebar());
    expect(result.current.isMobileOpen).toBe(true);
    act(() => result.current.toggleMobileSidebar());
    expect(result.current.isMobileOpen).toBe(false);
  });

  it("reports collapsed below the lg breakpoint and closes the drawer when growing back", () => {
    const { result } = renderHook(() => useSidebar(), { wrapper: SidebarProvider });
    act(() => result.current.toggleMobileSidebar());
    expect(result.current.isMobileOpen).toBe(true);
    // Shrinking keeps the drawer state but forces the collapsed layout.
    setWidth(500);
    expect(result.current.isMobileOpen).toBe(true);
    expect(result.current.isExpanded).toBe(false);
    // Growing back to desktop closes the drawer.
    setWidth(1440);
    expect(result.current.isMobileOpen).toBe(false);
  });
});
