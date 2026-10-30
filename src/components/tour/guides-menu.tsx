"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeIndianRupee,
  CheckCircle2,
  Coins,
  GraduationCap,
  Landmark,
  MessagesSquare,
  PlayCircle,
  Rocket,
  Settings2,
  Sparkles,
  Store,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchTours, TOUR_CATEGORY_LABEL, TOUR_CATEGORY_ORDER } from "@/src/lib/tours/registry";
import type { Tour } from "@/src/lib/tours/types";
import { useTours } from "./tour-provider";

const CATEGORY_ICON: Record<Tour["category"], LucideIcon> = {
  start: Rocket,
  customers: UsersRound,
  schemes: Landmark,
  money: BadgeIndianRupee,
  store: Store,
  metals: Coins,
  engage: MessagesSquare,
  setup: Settings2,
};

/** Opens the Guides panel from anywhere (e.g. a "See all guides" link). */
export const OPEN_GUIDES_EVENT = "swarnagrow:open-guides";

/**
 * Top-bar "Guides" button and the searchable panel of every walkthrough the user
 * can run. Keyboard-first: type, ↑ ↓, Enter.
 */
export function GuidesMenu({ onAskSidekick }: { onAskSidekick?: () => void }) {
  const { tours, progress, start } = useTours();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_GUIDES_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_GUIDES_EVENT, onOpen);
  }, []);

  const results = useMemo(() => searchTours(tours, query), [tours, query]);
  const grouped = useMemo(() => {
    if (query.trim()) return [{ cat: null as Tour["category"] | null, items: results }];
    return TOUR_CATEGORY_ORDER.map((cat) => ({ cat, items: results.filter((t) => t.category === cat) })).filter(
      (g) => g.items.length,
    );
  }, [results, query]);

  if (!tours.length) return null;
  const doneCount = tours.filter((t) => progress.completed[t.id]).length;

  const launch = (id: string) => {
    setOpen(false);
    setQuery("");
    // Let the panel finish closing so the guide doesn't mistake it for a form.
    window.setTimeout(() => start(id, "menu"), 220);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        data-tour="shell-guides"
        onClick={() => setOpen(true)}
        className="h-11 shrink-0 gap-2 rounded-xl px-2.5 text-[#28161a] sm:px-3"
        aria-label="Step-by-step guides"
        title="Step-by-step guides"
      >
        <GraduationCap className="size-5 text-[#730321]" />
        <span className="hidden font-semibold 2xl:inline">Guides</span>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
        title="Step-by-step guides"
        description="Search every walkthrough"
        shouldFilter={false}
        className="sm:max-w-xl"
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="What do you want to do? e.g. add product, COD, redeem…"
        />
        <div className="flex items-center justify-between border-b px-4 py-2 text-xs text-muted-foreground">
          <span>
            {tours.length} guides · {doneCount} done
          </span>
          <span className="hidden sm:inline">↑ ↓ to move · Enter to start</span>
        </div>
        <CommandList className="max-h-[min(62vh,30rem)]">
          <CommandEmpty>
            <div className="space-y-2 py-2">
              <p>No guide matches that.</p>
              {onAskSidekick ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-[#730321] underline-offset-2 hover:underline"
                  onClick={() => {
                    setOpen(false);
                    onAskSidekick();
                  }}
                >
                  Ask Sidekick instead
                </button>
              ) : null}
            </div>
          </CommandEmpty>
          {onAskSidekick && !query.trim() ? (
            <CommandGroup heading="Not sure where to start?">
              <CommandItem
                value="ask-sidekick"
                onSelect={() => {
                  setOpen(false);
                  onAskSidekick();
                }}
                className="gap-3"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#f8f0de] text-[#730321]">
                  <Sparkles className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">Ask Sidekick how to…</span>
                  <span className="block text-xs text-muted-foreground">
                    In your own words, e.g. &ldquo;customer kaise add kare?&rdquo;
                  </span>
                </span>
              </CommandItem>
            </CommandGroup>
          ) : null}
          {grouped.map(({ cat, items }) => {
            return (
              <CommandGroup key={cat ?? "results"} heading={cat ? TOUR_CATEGORY_LABEL[cat] : "Best matches"}>
                {items.map((tour) => {
                  const done = Boolean(progress.completed[tour.id]);
                  const Icon = CATEGORY_ICON[tour.category];
                  return (
                    <CommandItem key={tour.id} value={tour.id} onSelect={() => launch(tour.id)} className="items-start gap-3">
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-[#fbf3f5] text-[#730321]">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-5">{tour.title}</span>
                        <span className="block text-xs leading-4 text-muted-foreground">{tour.summary}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 pt-0.5 text-[11px] text-muted-foreground">
                        ≈ {tour.minutes} min
                        {done ? (
                          <CheckCircle2 className="!size-4 text-emerald-600" aria-label="Done before" />
                        ) : (
                          <PlayCircle className="!size-4 text-[#730321]" />
                        )}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
