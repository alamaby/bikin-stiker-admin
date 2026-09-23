"use client";

import { useTranslations } from "next-intl";
import { toolbarBtn } from "@/components/tables/table-styles";

export function StickerThumb({ signedUrl, alt }: { signedUrl: string | null; alt: string }) {
  if (!signedUrl) return <span className="text-gray-400">—</span>;
  return (
    <img
      src={signedUrl}
      alt={alt}
      width={48}
      height={48}
      className="h-12 w-12 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-gray-700"
      loading="lazy"
    />
  );
}

export function DownloadStickerButton({ signedUrl, filename }: { signedUrl: string | null; filename: string }) {
  const t = useTranslations("stickers");
  if (!signedUrl) return null;
  return (
    <a href={signedUrl} download={filename} target="_blank" rel="noreferrer" className={toolbarBtn(false)}>
      {t("download")}
    </a>
  );
}
