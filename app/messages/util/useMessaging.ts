"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { InboxRow } from "@/types/InboxRow";
import type { ChatMessage } from "@/types/ChatMessage";

const LS_LAST_CONV = "auconnect:lastConversationId";
const LS_LAST_USER = "auconnect:lastUserId";

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

export function useMessaging() {
  const [inbox, setInbox] = useState<InboxRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const [messagesByConv, setMessagesByConv] = useState<Record<string, ChatMessage[]>>({});
  const [messageInput, setMessageInput] = useState("");
  const [showChatMobile, setShowChatMobile] = useState(false);

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

  // ---------- read helpers ----------
  const markReadLocal = (conversationId: string) => {
    setInbox((prev) =>
      prev.map((x) => (x.conversationId === conversationId ? { ...x, unreadCount: 0 } : x))
    );
  };

  // throttle so it never spams /read
  const lastReadPostAtRef = useRef<Record<string, number>>({});
  const markReadServerSafe = async (conversationId: string) => {
    if (!conversationId) return;

    const now = Date.now();
    const last = lastReadPostAtRef.current[conversationId] ?? 0;
    if (now - last < 3000) return; // max 1 POST / 3s per conversation

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

    // keep current selection if exists, else last saved, else first row
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
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    return (json?.data?.conversationId as string) || null;
  };

  const fetchMessagesReplace = async (conversationId: string) => {
    const res = await fetch(`/api/connect/v1/messages/${conversationId}`, { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return;

    const incoming: ChatMessage[] = json?.data || [];
    setMessagesByConv((prev) => ({ ...prev, [conversationId]: dedupeById(incoming) }));
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

  // when selection changes: persist, fetch messages ONCE, mark read ONLY if unread
  useEffect(() => {
    if (!selectedConversationId || !selectedUserId) return;

    localStorage.setItem(LS_LAST_CONV, selectedConversationId);
    localStorage.setItem(LS_LAST_USER, selectedUserId);

    fetchMessagesReplace(selectedConversationId);

    // mark read ONLY if it has unread
    if (shouldMarkRead(selectedConversationId)) {
      markReadLocal(selectedConversationId);
      markReadServerSafe(selectedConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId, selectedUserId]);

  // poll active conversation (append only) WITHOUT spamming /read
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

      // mark read ONLY if new incoming arrived
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

      // update inbox row with newly created conversationId
      setInbox((prev) => prev.map((x) => (x.user.id === row.user.id ? { ...x, conversationId } : x)));
    }

    setSelectedConversationId(conversationId);

    // mark read only if unread
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

    // optimistic message (use a special id + "__me__" marker)
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
      // rollback optimistic
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
  };
}
