import { money } from "@/src/lib/format";
import type { AssistantTableColumn } from "@/src/types/assistant";

type CellValue = unknown;

export function formatAssistantCell(raw: CellValue, col?: AssistantTableColumn): string {
  if (raw == null) return "—";
  if (typeof raw === "object" && raw !== null) {
    const cell = raw as Record<string, unknown>;
    if (cell.cell === "customer") {
      const name = String(cell.name ?? "—");
      const mobile = cell.mobile ? String(cell.mobile) : "";
      return mobile ? `${name} · ${mobile}` : name;
    }
    if (cell.cell === "staff") return String(cell.name ?? "—");
    if (cell.cell === "currency") return String(cell.display ?? "—");
    if (cell.cell === "weight") return String(cell.display ?? "—");
    if (cell.cell === "datetime" || cell.cell === "date") return String(cell.display ?? cell.value ?? "—");
    if (typeof cell.name === "string") return cell.name;
    if (typeof cell.label === "string") return cell.label;
    if (typeof cell.amountDisplay === "string") return cell.amountDisplay;
  }
  if (col?.type === "currency" && typeof raw === "number") return money(raw / 100);
  if (col?.type === "date" && typeof raw === "string") {
    try {
      return new Date(raw).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return raw;
    }
  }
  if (typeof raw === "number" && col?.type === "count") return raw.toLocaleString("en-IN");
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  return String(raw);
}

export function renderAssistantCell(raw: CellValue, col?: AssistantTableColumn) {
  if (raw != null && typeof raw === "object" && (raw as { cell?: string }).cell === "customer") {
    const cell = raw as { name?: string; mobile?: string };
    return (
      <div className="min-w-[8.5rem]">
        <div className="font-medium text-[#28161a]">{cell.name ?? "—"}</div>
        {cell.mobile ? (
          <div className="text-xs text-[#807478]">{cell.mobile}</div>
        ) : null}
      </div>
    );
  }
  const numeric = col?.type === "currency" || col?.type === "count" || col?.type === "weight";
  return (
    <span
      className={numeric ? "ml-auto block max-w-[11rem] truncate text-right" : "block max-w-[14rem] truncate"}
      title={formatAssistantCell(raw, col)}
    >
      {formatAssistantCell(raw, col)}
    </span>
  );
}
