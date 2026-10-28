"use client";

import { ArrowDownRight, ArrowUpRight, ChevronDown, CornerDownRight, ListChecks, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { AssistantExportControl } from "@/src/components/assistant/AssistantExportControl";
import { SidekickChart } from "@/src/components/assistant/SidekickChart";
import { formatAssistantCell, renderAssistantCell } from "@/src/components/assistant/assistant-format";
import {
  ASSISTANT_NAME,
  RichText,
  SidekickBadge,
  formatStatValue,
  useCountUp,
  useRevealText,
} from "@/src/components/assistant/sidekick-primitives";
import type {
  AssistantBlock,
  AssistantBundle,
  AssistantStatCard,
  AssistantTableBlockData,
} from "@/src/types/assistant";

const CHAT_TABLE_ROW_CAP = 8;

/** Legacy (router) answers have flat statCards/chart/table — show them as blocks too. */
export function blocksOf(bundle: AssistantBundle): AssistantBlock[] {
  if (Array.isArray(bundle.blocks)) return bundle.blocks;
  const out: AssistantBlock[] = [];
  if (bundle.statCards?.length) out.push({ type: "stats", cards: bundle.statCards });
  if (bundle.chart) out.push({ type: "chart", chart: bundle.chart });
  if (bundle.table?.columns?.length && bundle.table.rows?.length) {
    out.push({
      type: "table",
      table: bundle.table,
      exportable: bundle.exportable,
      action: bundle.action,
      exportRecommended: bundle.exportRecommended,
    });
  }
  return out;
}

function StatTile({ card, animate, index }: { card: AssistantStatCard; animate: boolean; index: number }) {
  const value = useCountUp(Number(card.value) || 0, { enabled: animate });
  const up = card.delta != null && card.delta > 0;
  const down = card.delta != null && card.delta < 0;
  return (
    <div
      className="sk-rise rounded-xl border border-[var(--sk-line)] bg-[var(--sk-cream)] px-3.5 py-3"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="truncate text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--sk-muted)]">{card.label}</div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[19px] font-extrabold tracking-tight text-[var(--sk-ink)] tabular-nums">
          {formatStatValue(value, card.valueType)}
        </span>
        {card.delta != null ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[10.5px] font-bold",
              up && "bg-[var(--sk-ok-soft)] text-[var(--sk-ok)]",
              down && "bg-[var(--sk-bad-soft)] text-[var(--sk-bad)]",
              !up && !down && "bg-[var(--sk-cream-2)] text-[var(--sk-muted)]",
            )}
          >
            {up ? <ArrowUpRight className="size-3" /> : down ? <ArrowDownRight className="size-3" /> : null}
            {card.delta > 0 ? "+" : ""}
            {card.delta}%
          </span>
        ) : null}
      </div>
      {card.previous != null ? (
        <div className="mt-0.5 truncate text-[11px] text-[var(--sk-muted)]">
          vs {formatStatValue(card.previous, card.valueType)}
          {card.previousLabel ? ` · ${card.previousLabel}` : ""}
        </div>
      ) : null}
    </div>
  );
}

function StatsBlock({ cards, animate, title }: { cards: AssistantStatCard[]; animate: boolean; title?: string }) {
  if (!cards.length) return null;
  return (
    <div className="space-y-2">
      {title ? <p className="text-xs font-semibold text-[var(--sk-ink-2)]">{title}</p> : null}
      <div className={cn("grid gap-2.5", cards.length === 1 ? "grid-cols-1 sm:max-w-[16rem]" : cards.length === 2 ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-4")}>
        {cards.map((card, i) => (
          <StatTile key={`${card.label}-${i}`} card={card} animate={animate} index={i} />
        ))}
      </div>
    </div>
  );
}

/** A single-row answer ("your last UPI payment") reads better as a record card than a table. */
function RecordCard({ table, title }: { table: AssistantTableBlockData; title?: string }) {
  const row = table.rows[0] ?? {};
  const cols = table.columns.filter((c) => c.key !== "drilldownPath" && row[c.key] != null && row[c.key] !== "");
  const hero = cols.find((c) => c.type === "currency") ?? null;
  const rest = cols.filter((c) => c !== hero);
  return (
    <div className="sk-rise overflow-hidden rounded-xl border border-[var(--sk-line)] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--sk-line)] bg-[var(--sk-cream)] px-4 py-2.5">
        <span className="truncate text-xs font-semibold text-[var(--sk-ink-2)]">{title ?? "Record"}</span>
        {hero ? (
          <span className="text-lg font-extrabold tracking-tight text-[var(--sk-maroon)] tabular-nums">
            {formatAssistantCell(row[hero.key], hero)}
          </span>
        ) : null}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 px-4 py-3 text-sm sm:grid-cols-3">
        {rest.map((c) => (
          <div key={c.key} className="min-w-0">
            <dt className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--sk-muted)]">{c.label}</dt>
            <dd className="mt-0.5 truncate font-medium text-[var(--sk-ink)]" title={formatAssistantCell(row[c.key], c)}>
              {formatAssistantCell(row[c.key], c)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function TableBlock({ block, vizHint }: { block: Extract<AssistantBlock, { type: "table" }>; vizHint?: string }) {
  const [showAll, setShowAll] = useState(false);
  const columns = block.table.columns.filter((c) => c.key !== "drilldownPath");
  const allRows = block.table.rows ?? [];
  if (!columns.length || !allRows.length) return null;
  if (allRows.length === 1 && columns.length <= 10 && !block.exportRecommended) {
    return <RecordCard table={block.table} title={block.title} />;
  }
  const rows = showAll ? allRows : allRows.slice(0, CHAT_TABLE_ROW_CAP);
  const total = block.rowCount ?? allRows.length;
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--sk-line)] bg-white">
      {block.title ? (
        <div className="border-b border-[var(--sk-line)] px-3.5 py-2 text-xs font-semibold text-[var(--sk-ink-2)]">{block.title}</div>
      ) : null}
      <div className="max-h-80 overflow-auto">
        <table className="w-full min-w-[18rem] border-collapse text-left text-[12.8px]">
          <thead className="sticky top-0 z-10 bg-[var(--sk-cream)]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "whitespace-nowrap border-b border-[var(--sk-line)] px-3.5 py-2 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--sk-muted)]",
                    (col.type === "currency" || col.type === "count" || col.type === "weight") && "text-right",
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={String(row.id ?? row.key ?? index)}
                className="sk-rise border-b border-[var(--sk-line)] last:border-b-0 hover:bg-[#fdfaf7]"
                style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
              >
                {columns.map((col, ci) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-3.5 py-2 align-top text-[var(--sk-ink-2)]",
                      ci === 0 && "font-medium text-[var(--sk-ink)]",
                      (col.type === "currency" || col.type === "count" || col.type === "weight") && "text-right tabular-nums",
                    )}
                  >
                    {renderAssistantCell(row[col.key], col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--sk-line)] bg-[var(--sk-cream)] px-3.5 py-2">
        <p className="text-[11.5px] text-[var(--sk-muted)]">
          {rows.length < allRows.length
            ? `Showing ${rows.length} of ${total.toLocaleString("en-IN")}`
            : total > allRows.length
              ? `Showing ${allRows.length} of ${total.toLocaleString("en-IN")} · export for the full list`
              : `${total.toLocaleString("en-IN")} ${total === 1 ? "row" : "rows"}`}
        </p>
        <div className="flex items-center gap-3">
          {allRows.length > CHAT_TABLE_ROW_CAP ? (
            <button
              type="button"
              className="text-xs font-semibold text-[var(--sk-maroon)] underline-offset-4 hover:underline"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Show fewer" : `Show all ${allRows.length}`}
            </button>
          ) : null}
          <AssistantExportControl
            vizHint={vizHint}
            source={{ table: block.table, exportable: block.exportable, action: block.action, exportRecommended: block.exportRecommended }}
          />
        </div>
      </div>
    </div>
  );
}

function asOfLabel(bundle: AssistantBundle) {
  if (!bundle.asOf) return null;
  const d = new Date(bundle.asOf);
  if (Number.isNaN(d.getTime())) return null;
  const sameDay = new Date().toDateString() === d.toDateString();
  return sameDay
    ? d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function HowIGotThis({ bundle }: { bundle: AssistantBundle }) {
  const [open, setOpen] = useState(false);
  const steps = bundle.steps ?? [];
  const f = bundle.appliedFilters;
  if (!steps.length && !f) return null;
  return (
    <div className="text-[11.5px] text-[var(--sk-muted)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 font-medium hover:text-[var(--sk-maroon)]"
        aria-expanded={open}
      >
        <ListChecks className="size-3.5" />
        How I got this
        <ChevronDown className={cn("size-3.5 transition", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="sk-rise mt-2 space-y-1.5 rounded-lg border border-[var(--sk-line)] bg-[var(--sk-cream)] px-3 py-2.5">
          {steps.map((s) => (
            <div key={s.id} className="flex items-start gap-2">
              <CornerDownRight className="mt-0.5 size-3 shrink-0 text-[var(--sk-gold)]" />
              <span className="min-w-0 flex-1">
                <span className="text-[var(--sk-ink-2)]">{s.label}</span>
                {s.detail ? <span> · {s.detail}</span> : null}
              </span>
            </div>
          ))}
          {f ? (
            <p className="pt-1 text-[11px]">
              {[f.subject, f.dateRange, f.grouping].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          <p className="text-[11px]">Every figure comes from your live Swarna Grow data — nothing is estimated.</p>
        </div>
      ) : null}
    </div>
  );
}

export function AssistantMessage({
  bundle,
  fresh = false,
  onFollowUp,
  disabled = false,
}: {
  bundle: AssistantBundle;
  fresh?: boolean;
  onFollowUp?: (text: string) => void;
  disabled?: boolean;
}) {
  const text = (bundle.narrative ?? bundle.summaryText ?? "").trim();
  const { shown, done } = useRevealText(text, fresh);
  const safeShown = useMemo(() => {
    const marks = (shown.match(/\*\*/g) ?? []).length;
    return marks % 2 ? shown.replace(/\*\*(?![\s\S]*\*\*)/, "") : shown;
  }, [shown]);
  const blocks = blocksOf(bundle);
  const time = asOfLabel(bundle);
  const showTitle = Boolean(bundle.narrative && bundle.summaryText && bundle.summaryText !== ASSISTANT_NAME);

  return (
    <article className="sidekick w-full">
      <div className="flex items-center gap-2 text-[11.5px] font-semibold text-[var(--sk-muted)]">
        <SidekickBadge />
        <span className="text-[var(--sk-ink-2)]">{ASSISTANT_NAME}</span>
        {showTitle ? <span className="min-w-0 truncate font-medium">· {bundle.summaryText}</span> : null}
        <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 font-medium">
          {bundle.cached ? (
            <span className="rounded-full bg-[var(--sk-cream-2)] px-1.5 py-px text-[10px]">cached</span>
          ) : null}
          {time ? (
            <>
              <i className="sk-live-dot block size-1.5 rounded-full bg-[var(--sk-ok)]" />
              Live data · {time}
            </>
          ) : null}
        </span>
      </div>

      {text ? (
        <RichText
          text={safeShown}
          className={cn(
            "mt-2 text-[14.5px] leading-relaxed text-[var(--sk-ink)]",
            !done && "sk-caret",
            bundle.transientError && "text-[var(--sk-ink-2)]",
          )}
        />
      ) : null}

      {blocks.length && (done || !fresh) ? (
        <div className="mt-3.5 space-y-3">
          {blocks.map((block, i) => {
            if (block.type === "stats") return <StatsBlock key={i} cards={block.cards} animate={fresh} title={block.title} />;
            if (block.type === "chart")
              return (
                <div key={i} className="sk-rise rounded-xl border border-[var(--sk-line)] bg-white px-3.5 py-3" style={{ animationDelay: `${i * 80}ms` }}>
                  <SidekickChart chart={block.chart} />
                </div>
              );
            return <TableBlock key={i} block={block} vizHint={bundle.vizHint} />;
          })}
        </div>
      ) : null}

      {(done || !fresh) && (bundle.steps?.length || bundle.appliedFilters) ? (
        <div className="mt-3">
          <HowIGotThis bundle={bundle} />
        </div>
      ) : null}

      {onFollowUp && bundle.followUps?.length && (done || !fresh) ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {bundle.followUps.map((q, i) => (
            <button
              key={q}
              type="button"
              disabled={disabled}
              onClick={() => onFollowUp(q)}
              className="sk-pop inline-flex items-center gap-1.5 rounded-full border border-[var(--sk-line-2)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--sk-ink-2)] transition hover:-translate-y-px hover:border-[var(--sk-maroon)] hover:text-[var(--sk-maroon)] disabled:opacity-50"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <Sparkles className="size-3 text-[var(--sk-gold)]" />
              {q}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export { formatAssistantCell };
