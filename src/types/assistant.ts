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

export type AssistantBundle = {
  summaryText: string;
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
  conversationId?: string;
  messageId?: string;
};

export type AssistantConversationSummary = {
  _id: string;
  title: string;
  lastMessageAt: string;
  messageCount: number;
  createdAt?: string;
};

export type AssistantChatMessage =
  | { id: string; role: "user"; text: string; createdAt?: string }
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
