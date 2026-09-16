"use client";

import Link from "next/link";
import { Copy, LockKeyhole, MoreHorizontal, Pencil, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SchemePlan } from "@/src/types/domain";

export function PlanRowActions({
  plan,
  onDuplicate,
  onActivate,
  onDeactivate,
}: {
  plan: SchemePlan;
  onDuplicate: (
    id: string,
    options?: { openEditor?: boolean },
  ) => void | Promise<void>;
  onActivate: (id: string) => void | Promise<void>;
  onDeactivate: (id: string) => void | Promise<void>;
}) {
  return (
    <div
      className="flex items-center justify-end gap-1"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Button size="sm" variant="ghost" className="hidden lg:inline-flex" asChild>
        <Link href={`/schemes/${plan.id}`}>View</Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label="Plan actions">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href={`/schemes/${plan.id}`}>View plan</Link>
          </DropdownMenuItem>
          {plan.editLocked ? (
            <DropdownMenuItem
              className="gap-2"
              onClick={() => void onDuplicate(plan.id, { openEditor: true })}
            >
              <LockKeyhole className="size-4" />
              Duplicate to edit rules
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem asChild className="gap-2">
              <Link href={`/schemes/${plan.id}/edit`}>
                <Pencil className="size-4" />
                Edit in plan builder
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="gap-2"
            onClick={() => void onDuplicate(plan.id)}
          >
            <Copy className="size-4" />
            Duplicate plan
          </DropdownMenuItem>
          {plan.status === "DRAFT" ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2"
                onClick={() => void onActivate(plan.id)}
              >
                <Power className="size-4" />
                Activate plan
              </DropdownMenuItem>
            </>
          ) : plan.status === "ACTIVE" ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-red-700 focus:text-red-700"
                onClick={() => void onDeactivate(plan.id)}
              >
                <PowerOff className="size-4" />
                Deactivate
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
