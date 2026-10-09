"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Deep-link into Collections search (receipt no. or payment id). */
export function collectionsSearchHref(query: string): string {
  const q = query.trim();
  if (!q) return "/collections";
  return `/collections?q=${encodeURIComponent(q)}`;
}

const linkClass =
  "font-semibold text-[#730321] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#730321]/30 rounded-sm";

function stopRowNav(e: MouseEvent) {
  e.stopPropagation();
}

function EntityLink({
  href,
  children,
  className,
  onClick,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent) => void;
}) {
  return (
    <Link
      href={href}
      className={cn(linkClass, className)}
      onClick={(e) => {
        stopRowNav(e);
        onClick?.(e);
      }}
    >
      {children}
    </Link>
  );
}

export function CustomerLink({
  customerId,
  children,
  className,
}: {
  customerId?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const id = customerId?.trim();
  if (!id) return <span className={className}>{children}</span>;
  return (
    <EntityLink href={`/customers/${id}`} className={className}>
      {children}
    </EntityLink>
  );
}

export function EnrollmentLink({
  schemeId,
  children,
  className,
}: {
  schemeId?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const id = schemeId?.trim();
  if (!id) return <span className={className}>{children}</span>;
  return (
    <EntityLink href={`/enrollments/${id}`} className={className}>
      {children}
    </EntityLink>
  );
}

export function ReceiptLink({
  paymentId,
  receiptNo,
  children,
  className,
}: {
  paymentId?: string | null;
  receiptNo?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const query = receiptNo?.trim() || paymentId?.trim() || "";
  if (!query) return <span className={className}>{children}</span>;
  return (
    <EntityLink href={collectionsSearchHref(query)} className={className}>
      {children}
    </EntityLink>
  );
}
