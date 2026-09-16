"use client";

import Link from "next/link";
import {
  Bell,
  CircleHelp,
  CreditCard,
  Headphones,
  MessageCircleMore,
  Settings,
} from "lucide-react";
import { env } from "@/src/config/env";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** In-app help: support desk, alerts, and settings — not a separate API in V1. */
export function HelpCentreMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hidden size-10 shrink-0 sm:inline-flex"
          title="Help centre"
        >
          <CircleHelp className="size-5" />
          <span className="sr-only">Help centre</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Help centre</DropdownMenuLabel>
        <p className="px-2 pb-2 text-xs leading-5 text-muted-foreground">
          In-app shortcuts only (no separate help API in V1). Use Support desk
          for customer grievances; plan and billing changes go through
          Subscription.
        </p>
        {env.useMocks ? (
          <p className="px-2 pb-2 text-xs leading-5 text-amber-900">
            Mock mode is on — set{" "}
            <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_USE_MOCKS=false</code>{" "}
            to use the live backend.
          </p>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/support" className="cursor-pointer">
            <Headphones />
            Support desk
            <span className="ml-auto text-xs text-muted-foreground">
              Grievances
            </span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/alerts" className="cursor-pointer">
            <Bell />
            Alert centre
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/reminders" className="cursor-pointer">
            <MessageCircleMore />
            Reminder centre
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/subscription" className="cursor-pointer">
            <CreditCard />
            Plan & billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <Settings />
            All settings
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
