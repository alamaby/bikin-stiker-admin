"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { ImagePlus, BadgeCheck, Timer, Flag, ThumbsUp } from "lucide-react";
import type { StickerSummaryData } from "@/lib/sticker-summary";
import { formatDurationMs } from "@/lib/stickers";

const C_BRAND = "#465fff";
const C_SUCCESS = "#12b76a";
const C_GRID = "#98a2b3";

function SummaryCard({
  icon,
  label,
  value,
  footer,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  footer?: React.ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90">
        {icon}
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
          <h4 className="mt-1 text-title-sm font-bold text-gray-800 dark:text-white/90">{value}</h4>
        </div>
        {footer && <div>{footer}</div>}
      </div>
    </>
  );
  const cls = "rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]";
  return href ? (
    <a href={href} className={`${cls} transition hover:shadow-theme-sm block`}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function StickerSummary({ data, locale }: { data: StickerSummaryData | null; locale: string }) {
  const t = useTranslations("stickers");
  if (!data) return null;

  const successPct = Math.round((data.success / Math.max(1, data.total)) * 100);
  const downPct = Math.round((data.down / Math.max(1, data.up + data.down)) * 100);

  return (
    <div className="mb-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">{t("summary.title")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        <SummaryCard
          icon={<ImagePlus className="size-5 text-gray-600 dark:text-gray-300" />}
          label={t("summary.total")}
          value={data.total}
          footer={<span className="text-xs text-gray-500 dark:text-gray-400">{data.totalCost} {t("summary.credits")}</span>}
        />
        <SummaryCard
          icon={<BadgeCheck className="size-5 text-success-500" />}
          label={t("summary.successRate")}
          value={`${successPct}%`}
          footer={
            <span className="text-xs text-gray-500 dark:text-gray-400">
              S {data.success} · F {data.failed} · P {data.pending}
            </span>
          }
        />
        <SummaryCard
          icon={<Timer className="size-5 text-gray-600 dark:text-gray-300" />}
          label={t("summary.avgDuration")}
          value={formatDurationMs(data.avgMs)}
        />
        <SummaryCard
          icon={<Flag className="size-5 text-warning-500" />}
          label={t("summary.flagged")}
          value={data.flagged}
          href={`/${locale}/stickers?flagged=flagged`}
        />
        <SummaryCard
          icon={<ThumbsUp className="size-5 text-gray-600 dark:text-gray-300" />}
          label={t("summary.feedback")}
          value={`${data.up}/${data.down}`}
          footer={
            <div className="mt-1 flex h-2 w-full overflow-hidden rounded-full">
              <div className="bg-success-500" style={{ width: `${downPct}%` }} />
              <div className="bg-error-500" style={{ width: `${100 - downPct}%` }} />
            </div>
          }
        />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t("summary.trend")}</h3>
          {data.trend.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">{t("summary.noData")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.trend}>
                <CartesianGrid stroke={C_GRID} strokeOpacity={0.25} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip labelFormatter={(v) => `Date: ${v}`} formatter={(val: number, name: string) => [val, name]} />
                <Area type="monotone" dataKey="total" name="Total" stroke={C_BRAND} fill={C_BRAND} fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="success" name="Success" stroke={C_SUCCESS} fill={C_SUCCESS} fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t("summary.byProvider")}</h3>
          {data.providers.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">{t("summary.noData")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(140, data.providers.length * 40)}>
              <BarChart layout="vertical" data={data.providers} margin={{ left: 4 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(val: number) => val} />
                <Bar dataKey="value" name="Count" fill={C_BRAND} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
