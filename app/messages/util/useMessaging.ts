"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { InboxRow } from "@/types/InboxRow";
import type { ChatMessage } from "@/types/ChatMessage";
import { useRouter, useSearchParams } from "next/navigation";

const LS_LAST_CONV = "auconnect:lastConversationId";
const LS_LAST_USER = "auconnect:lastUserId";
const PAGE_SIZE = 50;


function isDraftConvId(id: string | null) {
  return !!id && id.startsWith("draft:");
}
function makeDraftConvId(userId: string) {
  return `draft:${userId}`;
}

function dedupeById(list: ChatMessage[]) {
  const seen = new Set<string>();
  const out: ChatMessage[] = [];
  for (const m of list) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  return out;
}

function mergeAppend(prev: ChatMessage[], incoming: ChatMessage[]) {
  if (!incoming.length) return prev;
  return dedupeById([...prev, ...incoming]);
}

function mergePrepend(prev: ChatMessage[], incoming: ChatMessage[]) {
  if (!incoming.length) return prev;
  return dedupeById([...incoming, ...prev]);
}

/** localStorage pending key per conversation (REAL conv only) */
function pendingKey(convId: string) {
  return `auconnect:pending:${convId}`;
}

function safeReadPending(convId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(pendingKey(convId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];

    return arr
      .filter(Boolean)
      .map((m: ChatMessage) => ({ ...m, status: "failed" as const }))
      .filter((m: ChatMessage) => typeof m.id === "string" && typeof m.createdAt === "string");
  } catch {
    return [];
  }
}

function safeWritePending(convId: string, list: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(pendingKey(convId), JSON.stringify(list));
  } catch { }
}

function safeUpsertPending(convId: string, msg: ChatMessage) {
  const current = safeReadPending(convId);
  const next = dedupeById([
    ...current.filter((x) => x.id !== msg.id),
    { ...msg, status: "failed" as const },
  ]);
  safeWritePending(convId, next);
}

function safeRemovePending(convId: string, id: string) {
  const current = safeReadPending(convId);
  const next = current.filter((x) => x.id !== id);
  safeWritePending(convId, next);
}

export function useMessaging() {
  const [inboxLoaded, setInboxLoaded] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const targetUserId = searchParams?.get("userId") ?? null;

  const [inbox, setInbox] = useState<InboxRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const [messagesByConv, setMessagesByConv] = useState<Record<string, ChatMessage[]>>({});
  const [messageInput, setMessageInput] = useState("");
  const [showChatMobile, setShowChatMobile] = useState(false);

  // Draft header fallback (when user not in inbox yet)
  const [draftPeer, setDraftPeer] = useState<{ id: string; username: string; profilePic: string | null } | null>(
    null
  );

  // reverse scroll state (per conversation)
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlderByConv, setHasMoreOlderByConv] = useState<Record<string, boolean>>({});

  const isAtBottomRef = useRef(true);

  // ---- refs to avoid stale values inside intervals ----
  const inboxRef = useRef<InboxRow[]>([]);
  const selectedConvRef = useRef<string | null>(null);
  const selectedUserRef = useRef<string | null>(null);
  const messagesByConvRef = useRef<Record<string, ChatMessage[]>>({});

  useEffect(() => {
    inboxRef.current = inbox;
  }, [inbox]);

  useEffect(() => {
    selectedConvRef.current = selectedConversationId;
    selectedUserRef.current = selectedUserId;
  }, [selectedConversationId, selectedUserId]);

  useEffect(() => {
    messagesByConvRef.current = messagesByConv;
  }, [messagesByConv]);

  // lock body scroll (so only panes scroll)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const activeMessages = useMemo(() => {
    if (!selectedConversationId) return [];
    return messagesByConv[selectedConversationId] ?? [];
  }, [messagesByConv, selectedConversationId]);

  const hasMoreOlder = useMemo(() => {
    if (!selectedConversationId) return false;
    if (isDraftConvId(selectedConversationId)) return false;
    return hasMoreOlderByConv[selectedConversationId] ?? true;
  }, [hasMoreOlderByConv, selectedConversationId]);

  // ---------- read helpers ----------
  const markReadLocal = (conversationId: string) => {
    setInbox((prev) =>
      prev.map((x) => (x.conversationId === conversationId ? { ...x, unreadCount: 0 } : x))
    );
  };

  const lastReadPostAtRef = useRef<Record<string, number>>({});
  const markReadServerSafe = async (conversationId: string) => {
    if (!conversationId) return;
    if (isDraftConvId(conversationId)) return;

    const now = Date.now();
    const last = lastReadPostAtRef.current[conversationId] ?? 0;
    if (now - last < 3000) return;

    lastReadPostAtRef.current[conversationId] = now;

    await fetch(`/api/connect/v1/messages/${conversationId}/read`, {
      method: "POST",
      credentials: "include",
    }).catch(() => { });
  };

  const shouldMarkRead = (conversationId: string) => {
    const row = inboxRef.current.find((r) => r.conversationId === conversationId);
    return (row?.unreadCount ?? 0) > 0;
  };

  const fetchInbox = async () => {
    setInboxLoaded(false);

    try {
      const res = await fetch("/api/connect/v1/messages/inbox", { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;

      const rows: InboxRow[] = json?.data || [];
      setInbox(rows);
      // 🔥 Auto refresh active conversation if server state changed
      const convId = selectedConvRef.current;
      if (convId && !isDraftConvId(convId)) {
        const serverRow = rows.find(r => r.conversationId === convId);
        const serverLast = serverRow?.lastMessageAt ?? null;

        const localMsgs = messagesByConvRef.current[convId] ?? [];
        const localLastSent = [...localMsgs]
          .reverse()
          .find(m => m.status === "sent");

        const localLast = localLastSent?.createdAt ?? null;

        // Case 1: server changed lastMessageAt (delete happened)
        if (serverLast !== localLast) {
          fetchMessagesReplace(convId);
        }

        // Case 2: conversation cleared (server null but local still has messages)
        if (!serverLast && localMsgs.length > 0) {
          fetchMessagesReplace(convId);
        }
      }


      // keep your existing auto-select logic
      setSelectedUserId((prev) => {
        if (prev) return prev;

        const lastUser = typeof window !== "undefined" ? localStorage.getItem(LS_LAST_USER) : null;
        if (lastUser && rows.some((r) => r.user.id === lastUser)) return lastUser;

        return rows[0]?.user.id ?? null;
      });

      setSelectedConversationId((prev) => {
        if (prev) return prev;

        const lastConv = typeof window !== "undefined" ? localStorage.getItem(LS_LAST_CONV) : null;
        if (lastConv && rows.some((r) => r.conversationId === lastConv)) return lastConv;

        return rows[0]?.conversationId ?? null;
      });
    } finally {
      setInboxLoaded(true);
    }
  };


  const ensureConversation = async (otherUserId: string) => {
    const res = await fetch(`/api/connect/v1/messages/conversation/with/${otherUserId}`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    return (json?.data?.conversationId as string) || null;
  };

  /** Merge server messages + locally failed pending messages */
  const setConversationMessagesWithPending = (conversationId: string, serverMsgs: ChatMessage[]) => {
    const pending = safeReadPending(conversationId);
    const merged = dedupeById([...serverMsgs, ...pending]).sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return ta - tb;
    });
    setMessagesByConv((prev) => ({ ...prev, [conversationId]: merged }));
  };

  const fetchMessagesReplace = async (conversationId: string) => {
    if (isDraftConvId(conversationId)) return;

    const res = await fetch(`/api/connect/v1/messages/${conversationId}`, { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return;

    const incoming: ChatMessage[] = (json?.data || []).map((m: ChatMessage) => ({
      ...m,
      status: "sent",
    }));

    setConversationMessagesWithPending(conversationId, dedupeById(incoming));

    setHasMoreOlderByConv((prev) => ({
      ...prev,
      [conversationId]: incoming.length === PAGE_SIZE,
    }));
  };

  const fetchMessagesAppendSince = async (conversationId: string, cursorISO?: string) => {
    if (isDraftConvId(conversationId)) return [];

    const qs = cursorISO ? `?cursor=${encodeURIComponent(cursorISO)}` : "";
    const res = await fetch(`/api/connect/v1/messages/${conversationId}${qs}`, { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return [];

    const incoming: ChatMessage[] = (json?.data || []).map((m: ChatMessage) => ({
      ...m,
      status: "sent",
    }));
    if (!incoming.length) return [];

    setMessagesByConv((prev) => {
      const current = prev[conversationId] ?? [];
      return { ...prev, [conversationId]: mergeAppend(current, incoming) };
    });

    return incoming;
  };

  const fetchMessagesOlderBefore = async (conversationId: string, beforeISO: string) => {
    if (isDraftConvId(conversationId)) return [];

    const res = await fetch(
      `/api/connect/v1/messages/${conversationId}?before=${encodeURIComponent(beforeISO)}`,
      { credentials: "include" }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return [];

    const incoming: ChatMessage[] = (json?.data || []).map((m: ChatMessage) => ({
      ...m,
      status: "sent",
    }));
    return incoming;
  };

  //  reverse infinite scroll action
  const loadOlder = useCallback(async () => {
    const convId = selectedConvRef.current;
    if (!convId) return;
    if (isDraftConvId(convId)) return;

    const canLoad = hasMoreOlderByConv[convId] ?? true;
    if (!canLoad) return;
    if (loadingOlder) return;

    const current = messagesByConvRef.current[convId] ?? [];
    const oldest = current[0];
    if (!oldest?.createdAt) return;

    setLoadingOlder(true);
    try {
      const older = await fetchMessagesOlderBefore(convId, oldest.createdAt);
      if (!older.length) {
        setHasMoreOlderByConv((prev) => ({ ...prev, [convId]: false }));
        return;
      }

      setMessagesByConv((prev) => {
        const cur = prev[convId] ?? [];
        return { ...prev, [convId]: mergePrepend(cur, older) };
      });

      if (older.length < PAGE_SIZE) {
        setHasMoreOlderByConv((prev) => ({ ...prev, [convId]: false }));
      }
    } finally {
      setLoadingOlder(false);
    }
  }, [hasMoreOlderByConv, loadingOlder]);

  // ---------- initial load + poll inbox ----------
  useEffect(() => {
    let alive = true;

    const run = async () => {
      try {
        await fetchInbox();
      } catch { }
    };

    run();

    const t = setInterval(() => {
      if (!alive) return;
      run();
    }, 4000);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // ---------- deep link ?userId= ----------
  const lastHandledTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!targetUserId) return;

    // handle whenever targetUserId changes
    if (lastHandledTargetRef.current === targetUserId) return;

    // Wait until inbox loaded
    if (!inboxLoaded) return;

    const existing = inbox.find((r) => r.user.id === targetUserId);

    if (existing?.conversationId) {
      // Existing real conversation
      setDraftPeer(null);
      setSelectedUserId(existing.user.id);
      setSelectedConversationId(existing.conversationId);
      setShowChatMobile(true);
      router.replace("/messages");
      lastHandledTargetRef.current = targetUserId;
      return;
    }

    // No conversation yet → fetch real user info
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/connect/v1/users/${targetUserId}`, {
          credentials: "include",
        });

        if (!res.ok) return;

        const json = await res.json();
        const user = json?.data;
        if (!user) return;

        setDraftPeer({
          id: user.id,
          username: user.username,
          profilePic: user.profilePic ?? null,
        });

        setSelectedUserId(user.id);
        setSelectedConversationId(makeDraftConvId(user.id));
        setShowChatMobile(true);
        router.replace("/messages");

        lastHandledTargetRef.current = targetUserId;
      } catch {
        // ignore
      }
    };

    fetchUser();
  }, [targetUserId, inbox, router]);



  // when selection changes: persist + fetch messages (only for real conv)
  useEffect(() => {
    if (!selectedConversationId || !selectedUserId) return;
    if (isDraftConvId(selectedConversationId)) return;

    localStorage.setItem(LS_LAST_CONV, selectedConversationId);
    localStorage.setItem(LS_LAST_USER, selectedUserId);

    fetchMessagesReplace(selectedConversationId);

    if (shouldMarkRead(selectedConversationId)) {
      markReadLocal(selectedConversationId);
      markReadServerSafe(selectedConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId, selectedUserId]);

  // poll active conversation (append only) - only real
  useEffect(() => {
    if (!selectedConversationId) return;
    if (isDraftConvId(selectedConversationId)) return;

    let alive = true;

    const t = setInterval(async () => {
      if (!alive) return;

      const convId = selectedConvRef.current;
      const otherUserId = selectedUserRef.current;
      if (!convId || !otherUserId) return;
      if (isDraftConvId(convId)) return;

      const current = messagesByConvRef.current[convId] ?? [];
      const lastSent = [...current].reverse().find((m) => m.status === "sent" && typeof m.createdAt === "string");
      const cursor = lastSent?.createdAt;

      const newMsgs = await fetchMessagesAppendSince(convId, cursor);
      if (!newMsgs.length) return;

      const hasIncoming = newMsgs.some((m) => m.senderId === otherUserId);
      if (hasIncoming) {
        markReadLocal(convId);
        markReadServerSafe(convId);
      }
    }, 4000);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [selectedConversationId]);

  // ---------- actions ----------
  const openChatWith = async (row: InboxRow) => {
    setDraftPeer(null); // now we're in real inbox land
    setSelectedUserId(row.user.id);
    setShowChatMobile(true);

    if (row.conversationId) {
      setSelectedConversationId(row.conversationId);

      if ((row.unreadCount ?? 0) > 0) {
        markReadLocal(row.conversationId);
        markReadServerSafe(row.conversationId);
      }
      return;
    }

    // If somehow row has no convId, open a draft
    setSelectedConversationId(makeDraftConvId(row.user.id));
  };

  const markMessageStatus = (convId: string, id: string, status: ChatMessage["status"]) => {
    setMessagesByConv((prev) => {
      const cur = prev[convId] ?? [];
      return {
        ...prev,
        [convId]: cur.map((m) => (m.id === id ? { ...m, status } : m)),
      };
    });
  };

  const sendMessage = async () => {
    if (!selectedUserId) return;

    const text = messageInput.trim();
    if (!text) return;

    setMessageInput("");

    // If we are in a draft chat, we still need a local key for messages
    const currentConvId = selectedConversationId ?? makeDraftConvId(selectedUserId);

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: optimisticId,
      senderId: "__me__",
      receiverId: selectedUserId,
      text,
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    // show immediately in current (draft or real)
    setSelectedConversationId(currentConvId);
    setMessagesByConv((prev) => {
      const current = prev[currentConvId] ?? [];
      return { ...prev, [currentConvId]: mergeAppend(current, [optimistic]) };
    });

    // if draft => create conversation ONLY NOW
    let realConvId = currentConvId;
    if (isDraftConvId(currentConvId)) {
      // offline: just mark failed locally (no persist, because no real conv)
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        markMessageStatus(currentConvId, optimisticId, "failed");
        return;
      }

      const created = await ensureConversation(selectedUserId);
      if (!created) {
        markMessageStatus(currentConvId, optimisticId, "failed");
        return;
      }

      realConvId = created;

      // migrate draft messages to real conversation bucket
      setMessagesByConv((prev) => {
        const draftMsgs = prev[currentConvId] ?? [];
        const next = { ...prev };
        delete next[currentConvId];
        next[realConvId] = draftMsgs;
        return next;
      });

      // switch selection to real conv
      setSelectedConversationId(realConvId);

      // Also add an inbox row locally so it appears immediately (no need to wait poll)
      const username = draftPeer?.username ?? "User";
      const profilePic = draftPeer?.profilePic ?? null;

      setInbox((prev) => {
        // don't duplicate
        if (prev.some((r) => r.user.id === selectedUserId)) return prev;

        const newRow: InboxRow = {
          user: { id: selectedUserId, username, title: null, profilePic },
          conversationId: realConvId,
          lastMessageAt: optimistic.createdAt,
          lastMessageText: `You: ${text}`,
          unreadCount: 0,
        };

        return [newRow, ...prev];
      });
    }

    // send to server (real conversation)
    const res = await fetch(`/api/connect/v1/messages/${realConvId}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).catch(() => null);

    if (!res) {
      markMessageStatus(realConvId, optimisticId, "failed");
      // persist only if real conversation exists
      if (!isDraftConvId(realConvId)) safeUpsertPending(realConvId, { ...optimistic, status: "failed" });
      return;
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      markMessageStatus(realConvId, optimisticId, "failed");
      if (!isDraftConvId(realConvId)) safeUpsertPending(realConvId, { ...optimistic, status: "failed" });
      return;
    }

    const sent: ChatMessage | undefined = json?.data ? { ...json.data, status: "sent" } : undefined;

    if (!sent) {
      markMessageStatus(realConvId, optimisticId, "failed");
      if (!isDraftConvId(realConvId)) safeUpsertPending(realConvId, { ...optimistic, status: "failed" });
      return;
    }

    // replace optimistic with real message
    setMessagesByConv((prev) => {
      const current = prev[realConvId] ?? [];
      const withoutOptimistic = current.filter((m) => m.id !== optimisticId);
      return { ...prev, [realConvId]: mergeAppend(withoutOptimistic, [sent]) };
    });

    if (!isDraftConvId(realConvId)) safeRemovePending(realConvId, optimisticId);

    // update inbox row preview
    setInbox((prev) =>
      prev.map((x) =>
        x.conversationId === realConvId
          ? { ...x, lastMessageText: `You: ${sent.text ?? ""}`, lastMessageAt: sent.createdAt, unreadCount: 0 }
          : x
      )
    );
  };

  /** Manual retry (only works for REAL conversation ids) */
  const retryMessage = useCallback(async (messageId: string) => {
    const convId = selectedConvRef.current;
    if (!convId) return;
    if (isDraftConvId(convId)) return;

    const current = messagesByConvRef.current[convId] ?? [];
    const target = current.find((m) => m.id === messageId);
    if (!target || !target.text) return;

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      markMessageStatus(convId, messageId, "failed");
      safeUpsertPending(convId, { ...target, status: "failed" });
      return;
    }

    markMessageStatus(convId, messageId, "sending");

    const res = await fetch(`/api/connect/v1/messages/${convId}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: target.text }),
    }).catch(() => null);

    if (!res) {
      markMessageStatus(convId, messageId, "failed");
      safeUpsertPending(convId, { ...target, status: "failed" });
      return;
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      markMessageStatus(convId, messageId, "failed");
      safeUpsertPending(convId, { ...target, status: "failed" });
      return;
    }

    const sent: ChatMessage | undefined = json?.data ? { ...json.data, status: "sent" } : undefined;

    if (!sent) {
      markMessageStatus(convId, messageId, "failed");
      safeUpsertPending(convId, { ...target, status: "failed" });
      return;
    }

    setMessagesByConv((prev) => {
      const cur = prev[convId] ?? [];
      const withoutLocal = cur.filter((m) => m.id !== messageId);
      return { ...prev, [convId]: mergeAppend(withoutLocal, [sent]) };
    });

    safeRemovePending(convId, messageId);
  }, []);

  /** Local delete */
  const deleteLocalMessage = useCallback((messageId: string) => {
    const convId = selectedConvRef.current;
    if (!convId) return;

    setMessagesByConv((prev) => {
      const cur = prev[convId] ?? [];
      return { ...prev, [convId]: cur.filter((m) => m.id !== messageId) };
    });

    // only remove persisted pending if it's a real conversation
    if (!isDraftConvId(convId)) safeRemovePending(convId, messageId);
  }, []);

  const deleteMessageForEveryone = useCallback(async (messageId: string) => {
    const convId = selectedConvRef.current;
    if (!convId) return;

    const res = await fetch(
      `/api/connect/v1/messages/${convId}/message/${messageId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (!res.ok) return;

    // Remove locally
    setMessagesByConv((prev) => {
      const cur = prev[convId] ?? [];
      return {
        ...prev,
        [convId]: cur.filter((m) => m.id !== messageId),
      };
    });

    // Refresh inbox preview
    fetchInbox();
  }, []);

  const clearConversation = useCallback(async () => {
    const convId = selectedConvRef.current;
    if (!convId) return;

    const res = await fetch(
      `/api/connect/v1/messages/${convId}/clear`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (!res.ok) return;

    // Clear local messages
    setMessagesByConv((prev) => ({
      ...prev,
      [convId]: [],
    }));

    fetchInbox();
  }, []);

  /** Inbox preview helper */
  const getRowPreview = useCallback((row: InboxRow) => {
    const convId = row.conversationId;
    if (!convId) return { text: row.lastMessageText ?? null, time: row.lastMessageAt ?? null, isFailed: false };

    const msgs = messagesByConvRef.current[convId] ?? [];
    if (!msgs.length) return { text: row.lastMessageText ?? null, time: row.lastMessageAt ?? null, isFailed: false };

    const last = msgs[msgs.length - 1];
    if (!last) return { text: row.lastMessageText ?? null, time: row.lastMessageAt ?? null, isFailed: false };

    const isMine = last.senderId === "__me__" || last.senderId !== row.user.id;

    if (isMine && last.status === "failed") {
      return { text: `(Failed) You: ${last.text ?? ""}`, time: last.createdAt ?? null, isFailed: true };
    }
    if (isMine && last.status === "sending") {
      return { text: `(Sending…) You: ${last.text ?? ""}`, time: last.createdAt ?? null, isFailed: false };
    }

    return { text: row.lastMessageText ?? null, time: row.lastMessageAt ?? null, isFailed: false };
  }, []);

  return {
    inbox,
    selectedUserId,
    selectedConversationId,
    activeMessages,
    messageInput,
    setMessageInput,
    showChatMobile,
    setShowChatMobile,
    isAtBottomRef,
    openChatWith,
    sendMessage,
    loadOlder,
    hasMoreOlder,
    loadingOlder,
    retryMessage,
    deleteLocalMessage,
    getRowPreview,
    draftPeer,
    deleteMessageForEveryone,
    clearConversation,
  };
}
