/* @vitest-environment happy-dom */
import { beforeEach, describe, expect, it } from "vitest";
import {
  assistantConversationStorageKey,
  clearAssistantConversationStorage,
  readAssistantConversationId,
  writeAssistantConversationId,
} from "@/src/lib/assistant-conversation-storage";

describe("assistant conversation storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("isolates the active conversation by tenant and user", () => {
    const alice = { tenantId: "tenant-a", userId: "user-1" };
    const bob = { tenantId: "tenant-a", userId: "user-2" };
    writeAssistantConversationId("conv-alice", alice);
    writeAssistantConversationId("conv-bob", bob);
    expect(readAssistantConversationId(alice)).toBe("conv-alice");
    expect(readAssistantConversationId(bob)).toBe("conv-bob");
    expect(assistantConversationStorageKey(alice)).not.toBe(
      assistantConversationStorageKey(bob),
    );
  });

  it("clears scoped keys on logout helper", () => {
    writeAssistantConversationId("conv-1", {
      tenantId: "tenant-a",
      userId: "user-1",
    });
    clearAssistantConversationStorage();
    expect(readAssistantConversationId({ tenantId: "tenant-a", userId: "user-1" })).toBeNull();
  });
});
