import { resolveScheduleFieldForSave } from "@/src/lib/datetime-local";

export type BannerSaveDraftInput = {
  title: string;
  subtitle: string;
  placement: string;
  displayOrder: string;
  destinationType: string;
  targetCategoryId: string;
  targetProductId: string;
  startsAtLocal: string;
  endsAtLocal: string;
  imageUploadId: string | null;
  editing?: {
    id: string;
    version: number;
    imageUploadId?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
  } | null;
};

export function buildBannerSaveBody(input: BannerSaveDraftInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    title: input.title.trim(),
    subtitle: input.subtitle,
    placement: input.placement,
    displayOrder: Number(input.displayOrder) || 0,
    destinationType: input.destinationType,
    targetCategoryId: input.destinationType === "CATEGORY" ? input.targetCategoryId || null : null,
    targetProductId: input.destinationType === "PRODUCT" ? input.targetProductId || null : null,
  };
  const nextStarts = resolveScheduleFieldForSave(input.startsAtLocal, input.editing?.startsAt);
  const nextEnds = resolveScheduleFieldForSave(input.endsAtLocal, input.editing?.endsAt);
  if (nextStarts !== undefined) body.startsAt = nextStarts;
  if (nextEnds !== undefined) body.endsAt = nextEnds;
  if (input.editing) {
    if (input.imageUploadId !== input.editing.imageUploadId) {
      body.imageUploadId = input.imageUploadId ?? null;
    }
  } else if (input.imageUploadId) {
    body.imageUploadId = input.imageUploadId;
  }
  return body;
}
