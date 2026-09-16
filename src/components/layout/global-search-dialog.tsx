"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Gift,
  Loader2,
  ReceiptText,
  UsersRound,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useActingBranchId } from "@/src/hooks/use-acting-branch-id";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import {
  listSearchQueryForApi,
  sanitizeListSearchQueryInput,
  shouldSkipListSearchQuery,
} from "@/src/lib/list-date-range";
import { useGetGlobalSearchQuery } from "@/src/store/api/admin-api";
import type { GlobalSearchKind } from "@/src/types/domain";
import { useAppSelector } from "@/src/store/hooks";

const KIND_ICON: Record<GlobalSearchKind, typeof UsersRound> = {
  CUSTOMER: UsersRound,
  ENROLLMENT: ClipboardList,
  RECEIPT: ReceiptText,
  REDEMPTION: Gift,
};

export function GlobalSearchDialog({
  open,
  onOpenChange,
  query,
  onQueryChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const router = useRouter();
  const branchId = useActingBranchId();
  const debouncedQ = useDebouncedValue(query.trim(), 280);
  const searchQuery = useGetGlobalSearchQuery(
    {
      q: listSearchQueryForApi(debouncedQ) || debouncedQ,
      branchId,
      limit: 6,
    },
    {
      skip:
        !open ||
        debouncedQ.length < 2 ||
        shouldSkipListSearchQuery(debouncedQ),
    },
  );

  const groups = searchQuery.data?.groups ?? [];
  const hasQuery = debouncedQ.length >= 2;
  const loading = hasQuery && searchQuery.isFetching;

  const flatCount = useMemo(
    () => groups.reduce((n, g) => n + g.items.length, 0),
    [groups],
  );

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      shouldFilter={false}
      title="Search Swarna Grow"
      description="Customers, enrollments, receipts, and redemptions"
      className="sm:max-w-xl"
    >
      <CommandInput
        placeholder="Fuzzy search — name, phone, enrollment, receipt…"
        value={query}
        onValueChange={(value) =>
          onQueryChange(sanitizeListSearchQueryInput(value))
        }
      />
      <CommandList>
        {!hasQuery ? (
          <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
        ) : loading && flatCount === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Searching…
          </div>
        ) : flatCount === 0 ? (
          <CommandEmpty>No matches for “{debouncedQ}”.</CommandEmpty>
        ) : (
          groups.map((group, index) => {
            const Icon = KIND_ICON[group.kind] ?? UsersRound;
            return (
              <div key={group.kind}>
                {index > 0 ? <CommandSeparator /> : null}
                <CommandGroup heading={group.label}>
                  {group.items.map((item) => (
                    <CommandItem
                      key={`${item.kind}-${item.id}`}
                      value={`${item.title} ${item.subtitle ?? ""}`}
                      onSelect={() => go(item.href)}
                    >
                      <Icon className="text-[#730321]" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{item.title}</div>
                        {item.subtitle ? (
                          <div className="truncate text-xs text-muted-foreground">
                            {item.subtitle}
                          </div>
                        ) : null}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            );
          })
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function useGlobalSearchHotkey(onOpen: () => void) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpen();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpen]);
}
