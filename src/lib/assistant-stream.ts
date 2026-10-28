import { env } from "@/src/config/env";
import { refreshTenantAccessToken } from "@/src/lib/auth-refresh-fetch";
import { TOKEN_KEYS } from "@/src/lib/auth-token-storage";
import type { AssistantBundle, AssistantStep } from "@/src/types/assistant";

/**
 * Streaming Sidekick chat over Server-Sent Events (POST /admin/assistant/chat/stream).
 * Emits live "thinking" steps while the agent runs tools, then resolves with the final bundle.
 */

export class AssistantStreamUnsupported extends Error {
  constructor(message = "Streaming is not available") {
    super(message);
    this.name = "AssistantStreamUnsupported";
  }
}

/** Shaped like RTK Query errors so existing error parsing keeps working. */
export type AssistantStreamError = {
  status: number;
  data: { code?: string; message?: string; error?: { code?: string; message?: string } };
};

function streamUrl(): string {
  return `${env.apiBaseUrl.replace(/\/$/, "")}/admin/assistant/chat/stream`;
}

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem(TOKEN_KEYS.tenant.access);
  const branch = localStorage.getItem("swarnagrow.actingBranch");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(branch && branch !== "ALL" ? { "X-Acting-Branch-Id": branch } : {}),
  };
}

type StreamEvent = { event: string; data: unknown };

function parseEvents(buffer: string): { events: StreamEvent[]; rest: string } {
  const events: StreamEvent[] = [];
  const chunks = buffer.split(/\r?\n\r?\n/);
  const rest = chunks.pop() ?? "";
  for (const chunk of chunks) {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of chunk.split(/\r?\n/)) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
    }
    if (!dataLines.length) continue;
    try {
      events.push({ event, data: JSON.parse(dataLines.join("\n")) });
    } catch {
      /* ignore malformed event */
    }
  }
  return { events, rest };
}

export async function streamAssistantChat({
  message,
  conversationId,
  onStep,
  signal,
}: {
  message: string;
  conversationId?: string | null;
  onStep?: (step: AssistantStep) => void;
  signal?: AbortSignal;
}): Promise<AssistantBundle> {
  const post = () =>
    fetch(streamUrl(), {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ message, ...(conversationId ? { conversationId } : {}) }),
      signal,
    });

  let response: Response;
  try {
    response = await post();
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") throw err;
    throw new AssistantStreamUnsupported("Network error before streaming started");
  }
  if (response.status === 401 && (await refreshTenantAccessToken())) {
    response = await post();
  }
  if (response.status === 404 || response.status === 405) {
    throw new AssistantStreamUnsupported(`Stream endpoint returned ${response.status}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.includes("text/event-stream")) {
    let data: AssistantStreamError["data"] = {};
    try {
      const body = (await response.json()) as {
        error?: { code?: string; message?: string };
      } & AssistantStreamError["data"];
      data = body?.error ? { ...body.error, error: body.error } : body;
    } catch {
      /* non-JSON error */
    }
    const error: AssistantStreamError = { status: response.status, data };
    throw error;
  }
  if (!response.body) throw new AssistantStreamUnsupported("Response has no body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let final: AssistantBundle | null = null;
  let failure: AssistantStreamError | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = parseEvents(buffer);
    buffer = rest;
    for (const evt of events) {
      if (evt.event === "step") onStep?.(evt.data as AssistantStep);
      else if (evt.event === "final") final = evt.data as AssistantBundle;
      else if (evt.event === "error") {
        const d = evt.data as { code?: string; message?: string; status?: number };
        failure = { status: d.status ?? 500, data: { code: d.code, message: d.message, error: { code: d.code, message: d.message } } };
      }
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) {
    for (const evt of parseEvents(`${buffer}\n\n`).events) {
      if (evt.event === "final") final = evt.data as AssistantBundle;
    }
  }
  if (failure) throw failure;
  if (!final) throw { status: 502, data: { message: "Sidekick stopped before finishing. Please try again." } } satisfies AssistantStreamError;
  return final;
}
