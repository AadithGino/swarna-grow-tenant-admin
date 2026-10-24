export type AssistantStatCard = {
  label: string;
  value: number;
  valueType?: "currency" | "count" | "weight" | "percent" | "number";
  delta?: number;
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

export type AssistantBundle = {
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
    };

export type AssistantCursorPageMeta = {
  nextCursor: string | null;
  hasMore: boolean;
  limit?: number;
};
