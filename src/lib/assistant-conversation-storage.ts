import type { AssistantStorageScope } from "@/src/types/assistant";

/** @deprecated Legacy single-key storage; cleared on logout. */
export const ASSISTANT_CONVERSATION_STORAGE_KEY = "swarnagrow.assistantConversationId";

const SCOPED_KEY_PREFIX = `${ASSISTANT_CONVERSATION_STORAGE_KEY}:`;

export function assistantConversationStorageKey(
  scope: AssistantStorageScope,
): string {
  return `${SCOPED_KEY_PREFIX}${scope.tenantId}:${scope.userId}`;
}

export function readAssistantConversationId(
  scope?: AssistantStorageScope | null,
): string | null {
  if (typeof window === "undefined") return null;
  if (scope?.tenantId && scope?.userId) {
    const raw = localStorage.getItem(assistantConversationStorageKey(scope));
    return raw?.trim() || null;
  }
  const legacy = localStorage.getItem(ASSISTANT_CONVERSATION_STORAGE_KEY);
  return legacy?.trim() || null;
}

export function writeAssistantConversationId(
  conversationId: string | null,
  scope?: AssistantStorageScope | null,
) {
  if (typeof window === "undefined") return;
  if (scope?.tenantId && scope?.userId) {
    const key = assistantConversationStorageKey(scope);
    if (!conversationId) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, conversationId);
    return;
  }
  if (!conversationId) {
    localStorage.removeItem(ASSISTANT_CONVERSATION_STORAGE_KEY);
    return;
  }
  localStorage.setItem(ASSISTANT_CONVERSATION_STORAGE_KEY, conversationId);
}

export function clearAssistantConversationId(scope?: AssistantStorageScope | null) {
  writeAssistantConversationId(null, scope);
}

export function clearAssistantConversationStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ASSISTANT_CONVERSATION_STORAGE_KEY);
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(SCOPED_KEY_PREFIX)) keys.push(key);
  }
  for (const key of keys) localStorage.removeItem(key);
}
