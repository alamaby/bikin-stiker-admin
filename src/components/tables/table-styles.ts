// Shared TailAdmin table/toolbar class tokens (free-nextjs-admin-dashboard, MIT License).
// Keeps Users / LLM Config / LLM Logs / Presets visually consistent.

export const tableWrap =
  "overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]";

export const tableScroll = "max-w-full overflow-x-auto";

export const tableHeadRow = "border-b border-gray-100 dark:border-white/[0.05]";

export const tableBody = "divide-y divide-gray-100 dark:divide-white/[0.05]";

export const thCell = "px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400";

export const tdCell = "px-5 py-4 text-start text-theme-sm text-gray-700 dark:text-gray-300";

export const tdTitle = "block font-medium text-gray-800 text-theme-sm dark:text-white/90";

export const tdSub = "block text-gray-500 text-theme-xs dark:text-gray-400";

export const sortLink = "inline-flex items-center gap-1 hover:text-gray-800 dark:hover:text-white/90";

export function toolbarBtn(active = false): string {
  const base = "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm ring-1 ring-inset transition";
  return active
    ? `${base} bg-brand-50 text-brand-600 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-400 dark:ring-brand-500/30`
    : `${base} bg-white text-gray-700 ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03]`;
}

export function primaryBtnLink(): string {
  return "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600";
}

export function ghostIconBtnLink(): string {
  return "inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5";
}

export const segWrap = "flex items-center gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-800";

export function segLink(active = false): string {
  const base = "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition";
  return active
    ? `${base} bg-brand-500 text-white shadow-theme-xs`
    : `${base} text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200`;
}

export const filterGrid2 = "grid gap-4 md:grid-cols-2";
export const filterGrid3 = "grid gap-4 md:grid-cols-3";
export const filterGrid4 = "grid gap-4 md:grid-cols-2 lg:grid-cols-4";

export const filterSubmitBtn =
  "inline-flex h-9 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50";

export const filterActions = "flex items-end gap-2";
