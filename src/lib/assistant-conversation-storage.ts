export const ASSISTANT_CONVERSATION_STORAGE_KEY = "swarnagrow.assistantConversationId";

export function readAssistantConversationId(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ASSISTANT_CONVERSATION_STORAGE_KEY);
  return raw?.trim() || null;
}

export function writeAssistantConversationId(conversationId: string | null) {
  if (typeof window === "undefined") return;
  if (!conversationId) {
    localStorage.removeItem(ASSISTANT_CONVERSATION_STORAGE_KEY);
    return;
  }
  localStorage.setItem(ASSISTANT_CONVERSATION_STORAGE_KEY, conversationId);
}

export function clearAssistantConversationId() {
  writeAssistantConversationId(null);
}
