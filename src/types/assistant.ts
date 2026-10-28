export type AssistantStatCard = {
  label: string;
  value: number;
  valueType?: "currency" | "count" | "weight" | "percent" | "number";
  delta?: number;
  /** Previous-period value (same unit as value) when the answer compares periods. */
  previous?: number;
  previousLabel?: string;
};

export type AssistantChartSeries = {
  name: string;
  data: { x: string; y: number }[];
};

export type AssistantChart = {
  type: "bar" | "line" | "donut";
  title?: string;
  yAxisType?: string;
  series: AssistantChartSeries[];
};

export type AssistantTableColumn = {
  key: string;
  label: string;
  type?: string;
};

export type AssistantExportable =
  | { entity: string; fields: string[] }
  | { reportKey: string; columns: string[] };

/** Minimal view of a bundle the export control needs (works for whole bundles and table blocks). */
export type AssistantExportSource = {
  table: AssistantTableBlockData | null;
  exportable?: AssistantExportable;
  action?: Record<string, unknown>;
  exportRecommended?: boolean;
};

export type AssistantStorageScope = {
  tenantId: string;
  userId: string;
};

export type AssistantAppliedFilters = {
  dateRange?: string;
  timezone?: string;
  metric?: string;
  grouping?: string;
  compareModes?: string[];
  subject?: string;
};

export type CollectionAnalyticsPlan = {
  operation?: "summary" | "trend" | "comparison" | "ranking" | "latest";
  metric?: "net_collected" | "gross_receipts";
  timeGrain?: "day" | "week" | "month";
  dimensions?: Array<"day" | "mode" | "branch" | "customer" | "scheme">;
  compareModes?: string[] | null;
  sort?: "chronological" | "measure_desc";
};

/** One live "thinking" step while Sidekick works (tool call). */
export type AssistantStep = {
  id: string;
  label: string;
  status: "running" | "done" | "error";
  detail?: string;
  tool?: string;
  ms?: number;
};

export type AssistantTableBlockData = {
  columns: AssistantTableColumn[];
  rows: Record<string, unknown>[];
};

/** Agent answers are an ordered list of visual blocks built from server-side results. */
export type AssistantBlock =
  | { type: "stats"; title?: string; cards: AssistantStatCard[] }
  | { type: "chart"; chart: AssistantChart }
  | {
      type: "table";
      title?: string;
      table: AssistantTableBlockData;
      rowCount?: number;
      exportRecommended?: boolean;
      exportable?: AssistantExportable;
      action?: Record<string, unknown>;
    };

export type AssistantBundle = {
  /** "agent" for the tool-calling engine; absent on legacy router answers. */
  engine?: "agent";
  blocks?: AssistantBlock[];
  steps?: AssistantStep[];
  followUps?: string[];
  needsClarification?: boolean;
  transientError?: boolean;
  summaryText: string;
  appliedFilters?: AssistantAppliedFilters;
  narrative?: string | null;
  statCards: AssistantStatCard[];
  chart: AssistantChart | null;
  table: {
    columns: AssistantTableColumn[];
    rows: Record<string, unknown>[];
  } | null;
  vizHint?: string;
  action?: Record<string, unknown>;
  exportable?: AssistantExportable;
  exportRecommended?: boolean;
  cached?: boolean;
  /** ISO timestamp for underlying report/query data, when provided by the API. */
  asOf?: string;
  cacheAgeSeconds?: number;
  conversationId?: string;
  messageId?: string;
};

export type AssistantSendResult =
  | { ok: true; conversationId: string | null }
  | { ok: false; draft: string; message: string };

export type AssistantConversationSummary = {
  _id: string;
  title: string;
  lastMessageAt: string;
  messageCount: number;
  createdAt?: string;
};

export type AssistantChatMessage =
  | {
      id: string;
      role: "user";
      text: string;
      createdAt?: string;
      sendFailed?: boolean;
    }
  | {
      id: string;
      role: "assistant";
      bundle: AssistantBundle;
      createdAt?: string;
      /** True for the answer that just arrived (plays the reveal animation once). */
      fresh?: boolean;
    };

export type AssistantCursorPageMeta = {
  nextCursor: string | null;
  hasMore: boolean;
  limit?: number;
};
