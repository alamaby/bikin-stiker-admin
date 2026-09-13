import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Explicit cleanup: Vitest projects do not inherit the root `globals` flag,
// so RTL's auto-cleanup (which relies on a global afterEach) is not active.
afterEach(() => {
  cleanup();
});
