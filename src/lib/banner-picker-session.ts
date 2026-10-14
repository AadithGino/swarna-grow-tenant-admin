export function createPickerSessionGuard() {
  let generation = 0;
  return {
    bump: () => {
      generation += 1;
      return generation;
    },
    isCurrent: (token: number) => token === generation,
    current: () => generation,
  };
}

export type PickerRequestState = "idle" | "loading" | "ready" | "empty" | "error";

export function productPickerAvailability(status: string | undefined): "published" | "unavailable" {
  return String(status ?? "").toUpperCase() === "PUBLISHED" ? "published" : "unavailable";
}
