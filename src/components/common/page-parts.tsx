import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#9a6f2a]">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-extrabold tracking-[-0.035em] text-[#241316] md:text-[2.15rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-4xl text-[0.95rem] leading-6 text-[#776a6d]">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}

export function Surface({
  children,
  className,
  title,
  description,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-[#e4d7d2] bg-white shadow-[0_2px_5px_rgb(67_15_25/3%)]",
        className,
      )}
    >
      {(title || description || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-[#eaded9] px-5 py-4">
          <div>
            {title && <h2 className="font-bold text-[#2d191d]">{title}</h2>}
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Section label above detail-page tab bars (use with TabsList variant="detail"). */
export function DetailRecordTabsHeader({ label }: { label: string }) {
  return (
    <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#9a6f2a]">
      {label}
    </p>
  );
}

export const detailRecordTabsChromeClass =
  "border-b border-[#eaded9] bg-[#faf7f5] px-4 py-4 sm:px-5";

export const detailRecordTabContentClass = "p-4 sm:p-5 focus-visible:outline-none";

export function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "wine",
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  tone?: "wine" | "gold" | "red" | "green" | "cream";
}) {
  const toneClasses = {
    wine: "bg-[#f7ecee] text-[#7b0a2b]",
    gold: "bg-[#fff7df] text-[#bb6200]",
    red: "bg-[#fff0f0] text-red-600",
    green: "bg-emerald-50 text-emerald-700",
    cream: "bg-[#f7ead0] text-[#815b1d]",
  };
  return (
    <div className="min-w-0 rounded-2xl border border-[#e4d7d2] bg-white p-5 shadow-[0_2px_5px_rgb(67_15_25/3%)]">
      <div
        className={cn(
          "mb-4 grid size-11 place-items-center rounded-xl",
          toneClasses[tone],
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="text-sm text-[#776a6d]">{label}</div>
      <div className="mt-1 truncate text-[1.7rem] font-extrabold tracking-tight text-[#28161a]">
        {value}
      </div>
      {detail && <div className="mt-1.5 text-sm text-[#807478]">{detail}</div>}
    </div>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-[#4f3d41]">
      {children}
    </label>
  );
}
