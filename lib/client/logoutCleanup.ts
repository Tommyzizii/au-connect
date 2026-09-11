"use client";

const LOGOUT_STORAGE_KEYS = [
  "au-connect-selected-actor",
  "auconnect:lastConversationId",
  "auconnect:lastUserId",
  "create-post-draft",
];

const LOGOUT_STORAGE_PREFIXES = [
  "auconnect:lastConversationId:",
  "auconnect:lastUserId:",
  "auconnect:pending:",
];

export function clearClientSessionStorage() {
  if (typeof window === "undefined") return;

  try {
    for (const key of LOGOUT_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }

    const keysToRemove: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key) continue;
      if (LOGOUT_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Storage can be unavailable in private mode; logout should still continue.
  }
}
