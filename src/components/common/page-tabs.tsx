"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  DetailRecordTabsHeader,
  Surface,
  detailRecordTabContentClass,
  detailRecordTabsChromeClass,
} from "@/src/components/common/page-parts";

type TabsRootProps = ComponentProps<typeof Tabs>;
type ListVariant = "detail" | "detailSub";

/** Card shell + tab root. Use `embedded` when tabs live inside an existing Surface. */
export function PageTabs({
  layout = "surface",
  className,
  children,
  ...tabsProps
}: TabsRootProps & {
  layout?: "surface" | "embedded";
}) {
  const tabs = (
    <Tabs className={cn("gap-0", className)} {...tabsProps}>
      {children}
    </Tabs>
  );
  if (layout === "embedded") return tabs;
  return <Surface className="overflow-visible">{tabs}</Surface>;
}

/** Standard section label + `detail` / `detailSub` tab list. Must be a direct child of PageTabs / Tabs. */
export function PageTabsBar({
  sectionLabel,
  listVariant = "detail",
  className,
  chromeClassName,
  compactLabel,
  children,
}: {
  sectionLabel: string;
  listVariant?: ListVariant;
  className?: string;
  chromeClassName?: string;
  compactLabel?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn(detailRecordTabsChromeClass, chromeClassName)}>
      <DetailRecordTabsHeader label={sectionLabel} compact={compactLabel} />
      <TabsList variant={listVariant} className={className}>
        {children}
      </TabsList>
    </div>
  );
}

/** Tab list only (e.g. nested schedule sub-views beside a local heading). */
export function PageSubTabsList({
  listVariant = "detailSub",
  className,
  children,
}: {
  listVariant?: ListVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <TabsList variant={listVariant} className={className}>
      {children}
    </TabsList>
  );
}

export function PageTabsPanel({
  className,
  flush,
  ...props
}: ComponentProps<typeof TabsContent> & { flush?: boolean }) {
  return (
    <TabsContent
      className={cn(flush ? "p-0 focus-visible:outline-none" : detailRecordTabContentClass, className)}
      {...props}
    />
  );
}

export { TabsTrigger as PageTab };

/** Filter tabs in a Surface toolbar (tabs drive content below, not Tab panels). */
export function PageFilterTabs({
  sectionLabel,
  className,
  tabsListClassName,
  toolbarChrome,
  children,
  ...tabsProps
}: TabsRootProps & {
  sectionLabel: string;
  /** Override tab list width/layout (default: compact `w-fit`). */
  tabsListClassName?: string;
  /** Use `plain` inside a parent Surface toolbar (no inner card chrome). */
  toolbarChrome?: "default" | "plain";
  children: ReactNode;
}) {
  const plain = toolbarChrome === "plain";
  return (
    <Tabs className={cn("gap-0", className)} {...tabsProps}>
      <PageTabsBar
        sectionLabel={sectionLabel}
        compactLabel={plain}
        chromeClassName={
          plain ? "border-0 bg-transparent px-0 py-0" : undefined
        }
        className={cn(
          "h-auto max-w-full !w-fit",
          tabsListClassName,
        )}
      >
        {children}
      </PageTabsBar>
    </Tabs>
  );
}
