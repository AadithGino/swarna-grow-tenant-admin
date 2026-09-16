"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { permissionLabel } from "@/src/lib/permission-catalog";

export function DetailInfoTile({
  label,
  value,
  className,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className={className}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 font-semibold text-[#2d191d]",
          mono && "font-mono text-sm",
        )}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

export function DetailFieldGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </dl>
  );
}

export function MoneyPair({
  block,
  fallback = "—",
}: {
  block?: { amountDisplay?: string; amountPaise?: number } | null;
  fallback?: string;
}) {
  if (!block?.amountDisplay) return fallback;
  return (
    <span title={block.amountPaise != null ? `${block.amountPaise} paise` : undefined}>
      {block.amountDisplay}
    </span>
  );
}

export function PermissionList({
  permissions,
  compact,
}: {
  permissions: string[];
  compact?: boolean;
}) {
  if (!permissions.length) {
    return (
      <p className="text-sm text-muted-foreground">No permissions assigned.</p>
    );
  }
  if (compact) {
    return (
      <ul className="space-y-2">
        {permissions.map((p) => (
          <li key={p} className="text-sm leading-snug text-[#1a1014]">
            {permissionLabel(p)}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {permissions.map((p) => (
        <li key={p}>
          <Badge variant="secondary" className="text-xs font-normal">
            {permissionLabel(p)}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

export function formatLastLogin(iso?: string | null) {
  if (!iso) return "Never signed in";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function formatRoleLabel(role: string) {
  return role
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
