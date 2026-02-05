"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { InboxRow } from "@/types/InboxRow";
import type { ChatMessage } from "@/types/ChatMessage";
import { useRouter, useSearchParams } from "next/navigation";

const LS_LAST_CONV = "auconnect:lastConversationId";
const LS_LAST_USER = "auconnect:lastUserId";
const PAGE_SIZE = 50;

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

export function useMessaging() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams?.get("userId") ?? null;

  const [inbox, setInbox] = useState<InboxRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const [messagesByConv, setMessagesByConv] = useState<Record<string, ChatMessage[]>>({});
  const [messageInput, setMessageInput] = useState("");
  const [showChatMobile, setShowChatMobile] = useState(false);

  // reverse scroll state (per conversation)
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlderByConv, setHasMoreOlderByConv] = useState<Record<string, boolean>>({});

  // Teams behavior: only follow output if user is at bottom (ChatPane updates this ref)
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
    return hasMoreOlderByConv[selectedConversationId] ?? true; // default true until proven false
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

    const now = Date.now();
    const last = lastReadPostAtRef.current[conversationId] ?? 0;
    if (now - last < 3000) return;

    lastReadPostAtRef.current[conversationId] = now;

    await fetch(`/api/connect/v1/messages/${conversationId}/read`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  };

  const shouldMarkRead = (conversationId: string) => {
    const row = inboxRef.current.find((r) => r.conversationId === conversationId);
    return (row?.unreadCount ?? 0) > 0;
  };

  // ---------- api helpers ----------
  const fetchInbox = async () => {
    const res = await fetch("/api/connect/v1/messages/inbox", { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return;

    const rows: InboxRow[] = json?.data || [];
    setInbox(rows);

    setSelectedUserId((prev) => {
      if (prev && rows.some((r) => r.user.id === prev)) return prev;

      const lastUser = typeof window !== "undefined" ? localStorage.getItem(LS_LAST_USER) : null;
      if (lastUser && rows.some((r) => r.user.id === lastUser)) return lastUser;

      return rows[0]?.user.id ?? null;
    });

    setSelectedConversationId((prev) => {
      if (prev && rows.some((r) => r.conversationId === prev)) return prev;

      const lastConv = typeof window !== "undefined" ? localStorage.getItem(LS_LAST_CONV) : null;
      if (lastConv && rows.some((r) => r.conversationId === lastConv)) return lastConv;

      return rows[0]?.conversationId ?? null;
    });
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

  const fetchMessagesReplace = async (conversationId: string) => {
    const res = await fetch(`/api/connect/v1/messages/${conversationId}`, { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return;

    const incoming: ChatMessage[] = json?.data || [];
    setMessagesByConv((prev) => ({ ...prev, [conversationId]: dedupeById(incoming) }));

    // if server returned < PAGE_SIZE, likely no older history
    setHasMoreOlderByConv((prev) => ({ ...prev, [conversationId]: incoming.length === PAGE_SIZE }));
  };

  const fetchMessagesAppendSince = async (conversationId: string, cursorISO?: string) => {
    const qs = cursorISO ? `?cursor=${encodeURIComponent(cursorISO)}` : "";
    const res = await fetch(`/api/connect/v1/messages/${conversationId}${qs}`, { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return [];

    const incoming: ChatMessage[] = json?.data || [];
    if (!incoming.length) return [];

    setMessagesByConv((prev) => {
      const current = prev[conversationId] ?? [];
      return { ...prev, [conversationId]: mergeAppend(current, incoming) };
    });

    return incoming;
  };

  const fetchMessagesOlderBefore = async (conversationId: string, beforeISO: string) => {
    const res = await fetch(
      `/api/connect/v1/messages/${conversationId}?before=${encodeURIComponent(beforeISO)}`,
      { credentials: "include" }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return [];

    const incoming: ChatMessage[] = json?.data || [];
    return incoming;
  };

  // ✅ reverse infinite scroll action
  const loadOlder = useCallback(async () => {
    const convId = selectedConvRef.current;
    if (!convId) return;

    const canLoad = (hasMoreOlderByConv[convId] ?? true);
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

      // if got < PAGE_SIZE, likely no more older
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
      } catch {}
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
  const didHandleDeepLinkRef = useRef(false);
  useEffect(() => {
    if (!targetUserId) return;
    if (didHandleDeepLinkRef.current) return;
    if (inbox.length === 0) return;

    didHandleDeepLinkRef.current = true;

    (async () => {
      const existing = inboxRef.current.find((r) => r.user.id === targetUserId);
      if (existing) {
        await openChatWith(existing);
        router.replace("/messages");
        return;
      }

      const conversationId = await ensureConversation(targetUserId);
      if (!conversationId) {
        router.replace("/messages");
        return;
      }

      setSelectedUserId(targetUserId);
      setSelectedConversationId(conversationId);
      setShowChatMobile(true);

      router.replace("/messages");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId, inbox.length]);

  // when selection changes: persist, fetch messages ONCE, mark read ONLY if unread
  useEffect(() => {
    if (!selectedConversationId || !selectedUserId) return;

    localStorage.setItem(LS_LAST_CONV, selectedConversationId);
    localStorage.setItem(LS_LAST_USER, selectedUserId);

    fetchMessagesReplace(selectedConversationId);

    if (shouldMarkRead(selectedConversationId)) {
      markReadLocal(selectedConversationId);
      markReadServerSafe(selectedConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId, selectedUserId]);

  // poll active conversation (append only)
  useEffect(() => {
    if (!selectedConversationId) return;

    let alive = true;

    const t = setInterval(async () => {
      if (!alive) return;

      const convId = selectedConvRef.current;
      const otherUserId = selectedUserRef.current;
      if (!convId || !otherUserId) return;

      const current = messagesByConvRef.current[convId] ?? [];
      const last = current[current.length - 1];
      const cursor = last?.createdAt;

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
    setSelectedUserId(row.user.id);
    setShowChatMobile(true);

    let conversationId = row.conversationId;

    if (!conversationId) {
      conversationId = await ensureConversation(row.user.id);
      if (!conversationId) return;

      setInbox((prev) => prev.map((x) => (x.user.id === row.user.id ? { ...x, conversationId } : x)));
    }

    setSelectedConversationId(conversationId);

    if ((row.unreadCount ?? 0) > 0) {
      markReadLocal(conversationId);
      markReadServerSafe(conversationId);
    }
  };

  const sendMessage = async () => {
    if (!selectedConversationId || !selectedUserId) return;

    const text = messageInput.trim();
    if (!text) return;

    setMessageInput("");

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: optimisticId,
      senderId: "__me__",
      receiverId: selectedUserId,
      text,
      createdAt: new Date().toISOString(),
    };

    setMessagesByConv((prev) => {
      const current = prev[selectedConversationId] ?? [];
      return { ...prev, [selectedConversationId]: mergeAppend(current, [optimistic]) };
    });

    setInbox((prev) =>
      prev.map((x) =>
        x.conversationId === selectedConversationId
          ? { ...x, lastMessageText: `You: ${text}`, lastMessageAt: optimistic.createdAt, unreadCount: 0 }
          : x
      )
    );

    const res = await fetch(`/api/connect/v1/messages/${selectedConversationId}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessagesByConv((prev) => {
        const current = prev[selectedConversationId] ?? [];
        return { ...prev, [selectedConversationId]: current.filter((m) => m.id !== optimisticId) };
      });
      return;
    }

    const sent: ChatMessage | undefined = json?.data;
    if (!sent) return;

    setMessagesByConv((prev) => {
      const current = prev[selectedConversationId] ?? [];
      const withoutOptimistic = current.filter((m) => m.id !== optimisticId);
      return { ...prev, [selectedConversationId]: mergeAppend(withoutOptimistic, [sent]) };
    });

    setInbox((prev) =>
      prev.map((x) =>
        x.conversationId === selectedConversationId
          ? { ...x, lastMessageText: `You: ${sent.text ?? ""}`, lastMessageAt: sent.createdAt, unreadCount: 0 }
          : x
      )
    );
  };

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

    //  for reverse scroll
    loadOlder,
    hasMoreOlder,
    loadingOlder,
  };
}
