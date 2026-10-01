/** Run cleanup when a dialog closes, then forward the open change. */
export function onDialogOpenChange(
  next: boolean,
  onOpenChange: (open: boolean) => void,
  onClose?: () => void,
) {
  if (!next) onClose?.();
  onOpenChange(next);
}

/** Run setup when a dialog opens, cleanup when it closes. */
export function onDialogOpenChangeWithReset(
  next: boolean,
  onOpenChange: (open: boolean) => void,
  onOpen?: () => void,
  onClose?: () => void,
) {
  if (next) onOpen?.();
  else onClose?.();
  onOpenChange(next);
}
