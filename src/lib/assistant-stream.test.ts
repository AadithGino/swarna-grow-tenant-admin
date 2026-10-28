/* @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssistantStreamUnsupported, streamAssistantChat } from "@/src/lib/assistant-stream";

vi.mock("@/src/lib/auth-refresh-fetch", () => ({ refreshTenantAccessToken: vi.fn(async () => false) }));

function sseResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream; charset=utf-8" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("streamAssistantChat", () => {
  it("emits steps (even when events are split across chunks) and resolves with the final bundle", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sseResponse([
          'event: step\ndata: {"id":"s1","label":"Finding your latest UPI payment","status":"running"}\n\n',
          ': keep-alive\n\nevent: step\ndata: {"id":"s1","label":"Finding your latest UPI payment","sta',
          'tus":"done","detail":"1 record found"}\n\n',
          'event: final\ndata: {"summaryText":"Last UPI payment","narrative":"₹100","statCards":[],"chart":null,"table":null}\n\n',
        ]),
      ),
    );
    const steps: string[] = [];
    const bundle = await streamAssistantChat({ message: "last upi", onStep: (s) => steps.push(`${s.id}:${s.status}`) });
    expect(steps).toEqual(["s1:running", "s1:done"]);
    expect(bundle.narrative).toBe("₹100");
  });

  it("turns an error event into an RTK-shaped error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => sseResponse(['event: error\ndata: {"code":"ASSISTANT_DAILY_LIMIT","message":"limit","status":429}\n\n'])),
    );
    await expect(streamAssistantChat({ message: "x" })).rejects.toMatchObject({ status: 429, data: { code: "ASSISTANT_DAILY_LIMIT" } });
  });

  it("signals 'unsupported' so callers can fall back to the JSON endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not found", { status: 404 })));
    await expect(streamAssistantChat({ message: "x" })).rejects.toBeInstanceOf(AssistantStreamUnsupported);
  });
});
