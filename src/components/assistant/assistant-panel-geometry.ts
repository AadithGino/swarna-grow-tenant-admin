const STORAGE_KEY = "swarnagrow-assistant-panel-geometry";

export type AssistantPanelGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const ASSISTANT_PANEL_MIN = { width: 340, height: 380 };
export const ASSISTANT_PANEL_DEFAULT = { width: 440, height: 640 };

export function defaultAssistantGeometry(): AssistantPanelGeometry {
  if (typeof window === "undefined") {
    return { x: 24, y: 24, ...ASSISTANT_PANEL_DEFAULT };
  }
  const height = Math.min(
    ASSISTANT_PANEL_DEFAULT.height,
    Math.max(ASSISTANT_PANEL_MIN.height, window.innerHeight - 48),
  );
  const width = ASSISTANT_PANEL_DEFAULT.width;
  return {
    width,
    height,
    x: Math.max(12, window.innerWidth - width - 24),
    y: Math.max(12, window.innerHeight - height - 24),
  };
}

export function clampAssistantGeometry(
  geom: AssistantPanelGeometry,
): AssistantPanelGeometry {
  if (typeof window === "undefined") return geom;
  const maxW = window.innerWidth - 24;
  const maxH = window.innerHeight - 24;
  const width = Math.min(maxW, Math.max(ASSISTANT_PANEL_MIN.width, geom.width));
  const height = Math.min(maxH, Math.max(ASSISTANT_PANEL_MIN.height, geom.height));
  const x = Math.min(
    Math.max(12, geom.x),
    window.innerWidth - width - 12,
  );
  const y = Math.min(
    Math.max(12, geom.y),
    window.innerHeight - height - 12,
  );
  return { x, y, width, height };
}

export function readAssistantGeometry(): AssistantPanelGeometry {
  if (typeof window === "undefined") return defaultAssistantGeometry();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAssistantGeometry();
    const parsed = JSON.parse(raw) as AssistantPanelGeometry;
    if (
      typeof parsed.x !== "number" ||
      typeof parsed.y !== "number" ||
      typeof parsed.width !== "number" ||
      typeof parsed.height !== "number"
    ) {
      return defaultAssistantGeometry();
    }
    return clampAssistantGeometry(parsed);
  } catch {
    return defaultAssistantGeometry();
  }
}

export function writeAssistantGeometry(geom: AssistantPanelGeometry) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(geom));
  } catch {
    /* ignore quota */
  }
}
