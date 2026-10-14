export type PickerRow = {
  id: string;
  name: string;
  active?: boolean;
  status?: string;
};

export type TargetLabelState =
  | { state: "selected"; label: string }
  | { state: "inactive"; label: string }
  | { state: "missing"; label: string };

export function resolveTargetLabel(
  selectedId: string,
  loaded: PickerRow[],
  pinned: { id: string; name: string; active?: boolean; status?: string } | null | undefined,
  noun: string,
): TargetLabelState | null {
  if (!selectedId) return null;
  const hit = loaded.find((row) => row.id === selectedId);
  if (hit) {
    const inactive =
      hit.active === false
      || hit.status === "ARCHIVED"
      || hit.status === "INACTIVE"
      || (noun === "product" && String(hit.status ?? "").toUpperCase() !== "PUBLISHED");
    if (inactive) {
      return {
        state: "inactive",
        label: `${hit.name} (${noun === "product" ? "product not published" : `${noun} inactive or archived`})`,
      };
    }
    return { state: "selected", label: hit.name };
  }
  if (pinned?.id === selectedId) {
    const inactive =
      pinned.active === false
      || pinned.status === "ARCHIVED"
      || pinned.status === "INACTIVE"
      || (noun === "product" && String(pinned.status ?? "").toUpperCase() !== "PUBLISHED");
    if (inactive) {
      return {
        state: "inactive",
        label: `${pinned.name} (${noun === "product" ? "product not published" : `${noun} inactive or archived`})`,
      };
    }
    return { state: "selected", label: pinned.name };
  }
  return {
    state: "missing",
    label: `Saved ${noun} is not in the loaded list (ID ${selectedId}). It may have been removed.`,
  };
}

/** Ensure the current selection appears in select options even when off-page. */
export function withPinnedPickerOption(
  loaded: PickerRow[],
  selectedId: string,
  pinned: { id: string; name: string } | null | undefined,
): PickerRow[] {
  if (!selectedId || loaded.some((row) => row.id === selectedId)) return loaded;
  const name = pinned?.id === selectedId ? pinned.name : `Saved selection (${selectedId})`;
  return [{ id: selectedId, name }, ...loaded];
}

export function filterPickerRows(rows: PickerRow[], query: string): PickerRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => row.name.toLowerCase().includes(q));
}
