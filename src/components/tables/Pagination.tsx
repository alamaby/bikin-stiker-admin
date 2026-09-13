import Link from "next/link";
import React from "react";
// Styled after TailAdmin free-nextjs-admin-dashboard tables/Pagination (MIT License).
// Server component: renders Prev/Next links; hrefs built by caller to preserve filters.

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  summary: (total: number, shown: number, page: number) => string;
  getHref: (page: number) => string;
}

const Pagination: React.FC<PaginationProps> = ({ page, totalPages, total, pageSize, summary, getHref }) => {
  if (totalPages <= 1) return null;
  const shown = Math.min(pageSize, Math.max(0, total - (page - 1) * pageSize));
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-gray-500 dark:text-gray-400">{summary(total, shown, page)}</p>
      <div className="flex items-center gap-2">
        {page <= 1 ? (
          <span className="inline-flex h-9 cursor-not-allowed items-center gap-1 rounded-lg bg-white px-3 text-sm text-gray-300 ring-1 ring-inset ring-gray-200 dark:bg-gray-800 dark:text-gray-600 dark:ring-gray-700">
            Prev
          </span>
        ) : (
          <Link
            href={getHref(page - 1)}
            className="inline-flex h-9 items-center gap-1 rounded-lg bg-white px-3 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
          >
            Prev
          </Link>
        )}
        <span className="flex items-center px-2 text-sm text-gray-700 dark:text-gray-300">
          {page} / {totalPages}
        </span>
        {page >= totalPages ? (
          <span className="inline-flex h-9 cursor-not-allowed items-center gap-1 rounded-lg bg-white px-3 text-sm text-gray-300 ring-1 ring-inset ring-gray-200 dark:bg-gray-800 dark:text-gray-600 dark:ring-gray-700">
            Next
          </span>
        ) : (
          <Link
            href={getHref(page + 1)}
            className="inline-flex h-9 items-center gap-1 rounded-lg bg-white px-3 text-sm text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
};

export default Pagination;
