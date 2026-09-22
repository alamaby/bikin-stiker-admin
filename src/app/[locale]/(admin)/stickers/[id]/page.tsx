import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import TailBadge from "@/components/ui/badge/TailBadge";
import { toolbarBtn } from "@/components/tables/table-styles";
import { buildLocaleHref } from "@/lib/locale-href";
import { resolveStickerStoragePath, formatDurationMs } from "@/lib/stickers";
import { PromptCell } from "@/app/[locale]/(admin)/llm-logs/_components/prompt-cell";
import { FlagForm } from "./flag-form";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  user_id: string;
  preset_name: string | null;
  user_prompt: string | null;
  final_prompt: string | null;
  negative_prompt: string | null;
  image_url: string | null;
  image_png_path: string | null;
  provider_name: string | null;
  model_name: string | null;
  provider_config_id: string | null;
  cost: number | null;
  status: string;
  is_flagged: boolean;
  flagged_at: string | null;
  flag_reason: string | null;
  created_at: string;
  completed_at: string | null;
  generation_duration_ms: number | null;
};

async function getStickerDetail(id: string) {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const columns = "id,user_id,preset_name,user_prompt,final_prompt,negative_prompt,image_url,image_png_path,provider_name,model_name,provider_config_id,cost,status,is_flagged,flagged_at,flag_reason,created_at,completed_at,generation_duration_ms";
  const { data: row, error } = await supabase.from("sticker_generations").select(columns).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;

  const [{ data: feedback }, { data: attempts }, { data: enhancements }] = await Promise.all([
    supabase.from("sticker_generation_feedback").select("rating,reason_tags,note,created_at").eq("sticker_generation_id", id).maybeSingle(),
    supabase.from("image_generation_attempt_logs").select("provider_name,model_name,attempt_index,success,latency_ms,status_code,error_message,created_at").eq("sticker_generation_id", id).order("attempt_index"),
    supabase.from("prompt_enhancement_logs").select("success,cached,latency_ms,error_message,created_at").eq("sticker_generation_id", id).order("created_at"),
  ]);

  let signedUrl: string | null = null;
  const resolved = resolveStickerStoragePath({ image_png_path: row.image_png_path, image_url: row.image_url });
  if (resolved.path && !resolved.isAbsoluteUrl) {
    try {
      const { data: sd } = await supabase.storage.from("stickers").createSignedUrl(resolved.path, 300);
      signedUrl = sd?.signedUrl ?? null;
    } catch {
      // keep null
    }
  } else {
    signedUrl = resolved.path;
  }

  return { row: row as Row, feedback, attempts: attempts ?? [], enhancements: enhancements ?? [], signedUrl };
}

export default async function StickerDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const tc = await getTranslations({ locale, namespace: "common" });
  const t = await getTranslations({ locale, namespace: "stickers" });

  const detail = await getStickerDetail(id);
  if (!detail) notFound();

  const { row, feedback, attempts, enhancements, signedUrl } = detail;

  const durationBetween = row.created_at && row.completed_at
    ? formatDurationMs(new Date(row.completed_at).getTime() - new Date(row.created_at).getTime())
    : null;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Link href={buildLocaleHref(locale, "/stickers")} className={toolbarBtn(false)}>
          <ArrowLeft className="size-4" /> {tc("back")}
        </Link>
        <TailBadge variant="light" color={row.status === "success" ? "success" : row.status === "failed" ? "error" : "light"}>{row.status}</TailBadge>
        {row.is_flagged && <TailBadge variant="solid" color="warning">{t("flagged")}</TailBadge>}
      </div>
      <p className="mb-6 font-mono text-xs text-gray-500 dark:text-gray-400">{id}</p>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">{t("preview")}</h3>
          </div>
          <div className="border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6">
            {signedUrl ? (
              <img src={signedUrl} alt={row.preset_name || row.id} width={256} height={256} className="rounded-lg object-cover ring-1 ring-gray-200 dark:ring-gray-700" />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg bg-gray-50 dark:bg-white/5 text-gray-400">—</div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {signedUrl && (
                <a href={signedUrl} download={`${row.id}.png`} target="_blank" rel="noreferrer" className={toolbarBtn(false)}>
                  {t("download")}
                </a>
              )}
            </div>
            <div className="mt-3 space-y-1 text-sm text-gray-700 dark:text-gray-300">
              {row.preset_name && <p><span className="font-medium">{t("preset")}:</span> {row.preset_name}</p>}
              <p><span className="font-medium">{t("cost")}:</span> {row.cost ?? "—"}</p>
              <p><span className="font-medium">{t("provider")}:</span> {row.provider_name ?? "—"}</p>
              <p><span className="font-medium">{t("model")}:</span> {row.model_name ?? "—"}</p>
              {row.provider_config_id && (
                <p>
                  <span className="font-medium">{t("config")}:</span>{" "}
                  <Link href={buildLocaleHref(locale, `/llm-config/${row.provider_config_id}`)} className="font-mono text-brand-600 hover:underline dark:text-brand-400">
                    {row.provider_config_id.slice(0, 8)}...
                  </Link>
                </p>
              )}
              <p>
                <span className="font-medium">{t("user")}:</span>{" "}
                <Link href={buildLocaleHref(locale, `/users/${row.user_id}`)} className="font-mono text-brand-600 hover:underline dark:text-brand-400">
                  {row.user_id.slice(0, 8)}...
                </Link>
              </p>
              {row.flag_reason && <p><span className="font-medium">{t("flagReason")}:</span> {row.flag_reason}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">{t("prompt")}</h3>
          </div>
          <div className="space-y-4 border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6">
            <div>
              <p className={`mb-1 ${t("finalPrompt")}`}>{t("finalPrompt")}:</p>
              <PromptCell text={row.final_prompt || row.user_prompt || ""} />
            </div>
            {row.negative_prompt && (
              <div>
                <p className="mb-1 font-medium text-gray-700 dark:text-gray-300">{t("negativePrompt")}:</p>
                <PromptCell text={row.negative_prompt} />
              </div>
            )}
            <div>
              <p className="mb-1 font-medium text-gray-700 dark:text-gray-300">{t("userPrompt")}:</p>
              <PromptCell text={row.user_prompt || ""} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] md:mt-6">
        <div className="px-6 py-5">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">{t("performance")}</h3>
        </div>
        <div className="border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6">
          <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
            <p><span className="font-medium">{t("genDuration")}:</span> {formatDurationMs(row.generation_duration_ms)}</p>
            {durationBetween && <p><span className="font-medium">Wall clock:</span> {durationBetween}</p>}
            <p><span className="font-medium">{t("created")}:</span> {new Date(row.created_at).toLocaleString("id-ID")}</p>
            <p><span className="font-medium">{t("completed")}:</span> {row.completed_at ? new Date(row.completed_at).toLocaleString("id-ID") : "—"}</p>
          </div>
          <p className="mb-2 font-medium text-gray-700 dark:text-gray-300">{t("attempts")}:</p>
          {attempts.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">—</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-2 py-1 text-start font-medium text-gray-500">{t("attemptIndex")}</th>
                    <th className="px-2 py-1 text-start font-medium text-gray-500">{t("provider")}</th>
                    <th className="px-2 py-1 text-start font-medium text-gray-500">{t("model")}</th>
                    <th className="px-2 py-1 text-start font-medium text-gray-500">{t("status")}</th>
                    <th className="px-2 py-1 text-start font-medium text-gray-500">{t("latency")}</th>
                    <th className="px-2 py-1 text-start font-medium text-gray-500">{t("errorCode") ?? "Code"}</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a, i) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50">
                      <td className="px-2 py-1 font-mono">{a.attempt_index}</td>
                      <td className="px-2 py-1">{a.provider_name ?? "—"}</td>
                      <td className="px-2 py-1 font-mono text-[10px]">{a.model_name ?? "—"}</td>
                      <td className="px-2 py-1">
                        <TailBadge variant="light" color={a.success ? "success" : "error"}>{a.success ? "ok" : "fail"}</TailBadge>
                      </td>
                      <td className="px-2 py-1">{a.latency_ms ?? "—"}</td>
                      <td className="px-2 py-1 font-mono text-[10px]">{a.status_code ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {enhancements.length > 0 && (
            <>
              <p className="mt-3 mb-2 font-medium text-gray-700 dark:text-gray-300">{t("enhancements")}:</p>
              <ul className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                {enhancements.map((e, i) => (
                  <li key={i}>
                    <TailBadge variant="light" color={e.success ? "success" : "error"}>{e.success ? "ok" : "fail"}</TailBadge>
                    {e.cached && <TailBadge color="light" className="ml-1">cached</TailBadge>}
                    {e.latency_ms != null && <span className="ml-2">{e.latency_ms} ms</span>}
                    {e.error_message && <span className="ml-2 text-error-600 dark:text-error-400">{e.error_message.slice(0, 80)}</span>}
                    <span className="ml-2 text-gray-400">{new Date(e.created_at).toLocaleString("id-ID")}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] md:mt-6">
        <div className="px-6 py-5">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">{t("rating")}</h3>
        </div>
        <div className="border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6">
          {!feedback ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("unrated")}</p>
          ) : (
            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <p>
                {feedback.rating === 1 ? (
                  <TailBadge variant="light" color="success">{t("up")}</TailBadge>
                ) : feedback.rating === -1 ? (
                  <TailBadge variant="light" color="error">{t("down")}</TailBadge>
                ) : (
                  <TailBadge color="light">{t("unrated")}</TailBadge>
                )}
              </p>
              {feedback.reason_tags && feedback.reason_tags.length > 0 && (
                <p><span className="font-medium">{t("reasonTags")}:</span> {feedback.reason_tags.join(", ")}</p>
              )}
              {feedback.note && <p><span className="font-medium">{t("note")}:</span> {feedback.note}</p>}
              {feedback.created_at && <p className="text-xs text-gray-400">{new Date(feedback.created_at).toLocaleString("id-ID")}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] md:mt-6">
        <div className="px-6 py-5">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">{t("moderation")}</h3>
        </div>
        <div className="border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6">
          <FlagForm id={row.id} isFlagged={row.is_flagged} />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] md:mt-6">
        <div className="px-6 py-5">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">{t("raw")}</h3>
        </div>
        <div className="border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6">
          <pre className="overflow-x-auto text-xs text-gray-700 dark:text-gray-300">{JSON.stringify(row, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
