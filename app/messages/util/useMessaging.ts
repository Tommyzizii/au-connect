"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { InboxRow } from "@/types/InboxRow";
import type { ChatMessage } from "@/types/ChatMessage";
import { useRouter, useSearchParams } from "next/navigation";
import { useActorStore } from "@/lib/stores/actorStore";

const LS_LAST_CONV = "auconnect:lastConversationId";
const LS_LAST_USER = "auconnect:lastUserId";
const PAGE_SIZE = 50;

function scopedStorageKey(base: string, actorKeyValue: string) {
  return `${base}:${actorKeyValue}`;
}

function isDraftConvId(id: string | null) {
  return !!id && id.startsWith("draft:");
}
function makeDraftConvId(type: "USER" | "COMMUNITY", id: string) {
  return `draft:${type}:${id}`;
}

function actorKey(type: "USER" | "COMMUNITY", id: string | null) {
  return `${type}:${id ?? ""}`;
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
      .filter(
        (m: ChatMessage) => typeof m.id === "string" && typeof m.createdAt === "string"
      );
  } catch {
    return [];
  }
}

function safeWritePending(convId: string, list: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(pendingKey(convId), JSON.stringify(list));
  } catch {}
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
  const selectedActor = useActorStore((state) => state.selectedActor);

  const targetUserId = searchParams?.get("userId") ?? null;
  const targetCommunityId = searchParams?.get("communityId") ?? null;
  const activeActorQuery = useMemo(() => {
    const params = new URLSearchParams({ actorType: selectedActor.type });
    if (selectedActor.type === "COMMUNITY" && selectedActor.communityId) {
      params.set("communityId", selectedActor.communityId);
    }
    return params.toString();
  }, [selectedActor]);
  const activeActorKey = useMemo(
    () =>
      selectedActor.type === "COMMUNITY"
        ? `COMMUNITY:${selectedActor.communityId ?? ""}`
        : "USER",
    [selectedActor],
  );

  const [inbox, setInbox] = useState<InboxRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const [messagesByConv, setMessagesByConv] = useState<Record<string, ChatMessage[]>>({});
  const [messageInput, setMessageInput] = useState("");
  const [showChatMobile, setShowChatMobile] = useState(false);
  const [initialUnreadByConv, setInitialUnreadByConv] = useState<Record<string, number>>({});
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);

  // Draft header fallback (when user not in inbox yet)
  const [draftPeer, setDraftPeer] = useState<{
    type: "USER" | "COMMUNITY";
    id: string;
    username: string;
    profilePic: string | null;
  } | null>(null);

  // reverse scroll state (per conversation)
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlderByConv, setHasMoreOlderByConv] = useState<Record<string, boolean>>({});

  const isAtBottomRef = useRef(true);

  // ---- refs to avoid stale values inside intervals ----
  const inboxRef = useRef<InboxRow[]>([]);
  const selectedConvRef = useRef<string | null>(null);
  const selectedUserRef = useRef<string | null>(null);
  const messagesByConvRef = useRef<Record<string, ChatMessage[]>>({});
  const activeActorQueryRef = useRef(activeActorQuery);
  const lastHandledTargetRef = useRef<string | null>(null);

  // ✅ NEW: track server conversation "version" (updatedAt)
  const convVersionRef = useRef<Record<string, string>>({});

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

  useEffect(() => {
    activeActorQueryRef.current = activeActorQuery;
    inboxRef.current = [];
    selectedConvRef.current = null;
    selectedUserRef.current = null;
    messagesByConvRef.current = {};
    convVersionRef.current = {};
    lastReadPostAtRef.current = {};
    lastHandledTargetRef.current = null;
    isAtBottomRef.current = true;

    setInbox([]);
    setInboxLoaded(false);
    setSelectedUserId(null);
    setSelectedConversationId(null);
    setDraftPeer(null);
    setMessagesByConv({});
    setMessageInput("");
    setShowChatMobile(false);
    setInitialUnreadByConv({});
    setHasMoreOlderByConv({});
  }, [activeActorQuery]);

  // lock body scroll (so only panes scroll)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [activeActorQuery]);

  const activeMessages = useMemo(() => {
    if (!selectedConversationId) return [];
    return messagesByConv[selectedConversationId] ?? [];
  }, [messagesByConv, selectedConversationId]);

  const hasMoreOlder = useMemo(() => {
    if (!selectedConversationId) return false;
    if (isDraftConvId(selectedConversationId)) return false;
    return hasMoreOlderByConv[selectedConversationId] ?? true;
  }, [hasMoreOlderByConv, selectedConversationId]);

  const messageApi = useCallback(
    (path: string) => {
      const separator = path.includes("?") ? "&" : "?";
      return `${path}${separator}${activeActorQuery}`;
    },
    [activeActorQuery],
  );

  const selectedPeer = useMemo(() => {
    if (!selectedUserId) return null;
    return (
      inbox.find((row) => row.conversationId === selectedConversationId)?.peer ??
      inbox.find((row) => row.peer.id === selectedUserId)?.peer ??
      (draftPeer && draftPeer.id === selectedUserId
        ? {
            type: draftPeer.type,
            id: draftPeer.id,
            name: draftPeer.username,
            subtitle: null,
            profilePic: draftPeer.profilePic,
          }
        : null)
    );
  }, [draftPeer, inbox, selectedConversationId, selectedUserId]);

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

    await fetch(messageApi(`/api/connect/v1/messages/${conversationId}/read`), {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  };

  const shouldMarkRead = (conversationId: string) => {
    const row = inboxRef.current.find((r) => r.conversationId === conversationId);
    return (row?.unreadCount ?? 0) > 0;
  };

  const fetchInbox = async () => {
    const requestActorQuery = activeActorQuery;
    setInboxLoaded(false);

    try {
      const res = await fetch(`/api/connect/v1/messages/inbox?${requestActorQuery}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (activeActorQueryRef.current !== requestActorQuery) return;
      if (!res.ok) return;

      const rows: InboxRow[] = json?.data || [];
      setInbox(rows);

      // 🔥 Auto refresh active conversation if server state changed
      const convId = selectedConvRef.current;
      if (convId && !isDraftConvId(convId)) {
        const serverRow = rows.find((r) => r.conversationId === convId);
        const serverLast = serverRow?.lastMessageAt ?? null;

        // ✅ NEW: version check (updatedAt) catches delete of older messages
        const serverVer = serverRow?.conversationUpdatedAt ?? "";
        const localVer = convVersionRef.current[convId] ?? "";

        if (serverVer && serverVer !== localVer) {
          convVersionRef.current[convId] = serverVer;
          fetchMessagesReplace(convId);
        } else {
          // Keep your old fallback check (still useful)
          const localMsgs = messagesByConvRef.current[convId] ?? [];
          const localLastSent = [...localMsgs].reverse().find((m) => m.status === "sent");
          const localLast = localLastSent?.createdAt ?? null;

          // Case 1: server changed lastMessageAt (delete latest / new last changed)
          if (serverLast !== localLast) {
            fetchMessagesReplace(convId);
          }

          // Case 2: conversation cleared (server null but local still has messages)
          if (!serverLast && localMsgs.length > 0) {
            fetchMessagesReplace(convId);
          }
        }
      }

      const currentConv = selectedConvRef.current;
      const currentPeer = selectedUserRef.current;
      const currentRow =
        (currentConv && rows.find((r) => r.conversationId === currentConv)) ||
        (currentPeer && rows.find((r) => r.peer.id === currentPeer)) ||
        null;

      if (currentRow) {
        if (currentRow.peer.id !== currentPeer) setSelectedUserId(currentRow.peer.id);
        if (currentRow.conversationId !== currentConv) {
          setSelectedConversationId(currentRow.conversationId);
        }
        return;
      }

      const lastConv =
        typeof window !== "undefined"
          ? localStorage.getItem(scopedStorageKey(LS_LAST_CONV, activeActorKey))
          : null;
      const lastPeer =
        typeof window !== "undefined"
          ? localStorage.getItem(scopedStorageKey(LS_LAST_USER, activeActorKey))
          : null;
      const restoredRow =
        (lastConv && rows.find((r) => r.conversationId === lastConv)) ||
        (lastPeer && rows.find((r) => r.peer.id === lastPeer)) ||
        rows[0] ||
        null;

      setSelectedUserId(restoredRow?.peer.id ?? null);
      setSelectedConversationId(restoredRow?.conversationId ?? null);
    } finally {
      setInboxLoaded(true);
    }
  };

  const ensureConversation = async (peerType: "USER" | "COMMUNITY", peerId: string) => {
    const endpoint =
      peerType === "COMMUNITY"
        ? `/api/connect/v1/messages/conversation/with-community/${peerId}`
        : `/api/connect/v1/messages/conversation/with/${peerId}`;
    const separator = endpoint.includes("?") ? "&" : "?";
    const res = await fetch(`${endpoint}${separator}${activeActorQuery}`, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (json?.requiresVerification) setVerificationModalOpen(true);
      return null;
    }
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

    const res = await fetch(messageApi(`/api/connect/v1/messages/${conversationId}`), {
      credentials: "include",
    });
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
    const res = await fetch(messageApi(`/api/connect/v1/messages/${conversationId}${qs}`), {
      credentials: "include",
    });
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
      messageApi(`/api/connect/v1/messages/${conversationId}?before=${encodeURIComponent(beforeISO)}`),
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
  }, [activeActorQuery]);

  // ---------- deep link ?userId= / ?communityId= ----------
  useEffect(() => {
    const targetType: "USER" | "COMMUNITY" | null = targetCommunityId
      ? "COMMUNITY"
      : targetUserId
        ? "USER"
        : null;
    const targetId = targetCommunityId ?? targetUserId;
    if (!targetType || !targetId) return;

    const targetKey = actorKey(targetType, targetId);
    if (lastHandledTargetRef.current === targetKey) return;

    // Wait until inbox loaded
    if (!inboxLoaded) return;

    const existing = inbox.find(
      (r) => r.peer.type === targetType && r.peer.id === targetId,
    );

    if (existing?.conversationId) {
      // Existing real conversation
      const convId = existing.conversationId; // ✅ string (narrowed by if)

      setDraftPeer(null);
      setSelectedUserId(existing.peer.id);
      setSelectedConversationId(convId);

      setInitialUnreadByConv((prev) => ({
        ...prev,
        [convId]: existing.unreadCount ?? 0,
      }));

      setShowChatMobile(true);

      // ✅ store version
      if (existing.conversationUpdatedAt) {
        convVersionRef.current[convId] = existing.conversationUpdatedAt;
      }

      router.replace("/messages");
      lastHandledTargetRef.current = targetKey;
      return;
    }

    if (targetType === "COMMUNITY") {
      const openCommunityConversation = async () => {
        const created = await ensureConversation("COMMUNITY", targetId);
        if (!created) return;

        setDraftPeer(null);
        setSelectedUserId(targetId);
        setSelectedConversationId(created);
        setShowChatMobile(true);
        router.replace("/messages");
        lastHandledTargetRef.current = targetKey;
        await fetchInbox();
      };

      openCommunityConversation();
      return;
    }

    // No conversation yet → fetch real user info
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/connect/v1/users/${targetId}`, {
          credentials: "include",
        });

        if (!res.ok) return;

        const json = await res.json();
        const user = json?.data;
        if (!user) return;

        setDraftPeer({
          type: "USER",
          id: user.id,
          username: user.username,
          profilePic: user.profilePic ?? null,
        });

        setSelectedUserId(user.id);
        setSelectedConversationId(makeDraftConvId("USER", user.id));
        setShowChatMobile(true);
        router.replace("/messages");

        lastHandledTargetRef.current = targetKey;
      } catch {
        // ignore
      }
    };

    fetchUser();
  }, [targetUserId, targetCommunityId, inbox, router, inboxLoaded, activeActorQuery]);

  // when selection changes: persist + fetch messages (only for real conv)
  useEffect(() => {
    if (!selectedConversationId || !selectedUserId) return;
    if (isDraftConvId(selectedConversationId)) return;

    localStorage.setItem(scopedStorageKey(LS_LAST_CONV, activeActorKey), selectedConversationId);
    localStorage.setItem(scopedStorageKey(LS_LAST_USER, activeActorKey), selectedUserId);

    // ✅ store version if we have it in inbox
    const row = inboxRef.current.find((r) => r.conversationId === selectedConversationId);
    if (row?.conversationUpdatedAt) {
      convVersionRef.current[selectedConversationId] = row.conversationUpdatedAt;
    }
    if (row) {
      setInitialUnreadByConv((prev) => {
        if (prev[selectedConversationId] !== undefined) return prev;
        return {
          ...prev,
          [selectedConversationId]: row.unreadCount ?? 0,
        };
      });
    }

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
      const lastSent = [...current]
        .reverse()
        .find((m) => m.status === "sent" && typeof m.createdAt === "string");
      const cursor = lastSent?.createdAt;

      const newMsgs = await fetchMessagesAppendSince(convId, cursor);
      if (!newMsgs.length) return;

      const peer =
        inboxRef.current.find((row) => row.conversationId === convId)?.peer ??
        inboxRef.current.find((row) => row.peer.id === otherUserId)?.peer;
      const hasIncoming = newMsgs.some((m) =>
        peer?.type === "COMMUNITY"
          ? m.senderActorType === "COMMUNITY" && m.senderCommunityId === peer.id
          : (m.senderActorType ?? "USER") === "USER" && m.senderId === otherUserId,
      );
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
    setSelectedUserId(row.peer.id);
    setShowChatMobile(true);

    if (row.conversationId) {
      const convId = row.conversationId; // ✅ string (narrowed)

      setSelectedConversationId(convId);
      setInitialUnreadByConv((prev) => ({
        ...prev,
        [convId]: row.unreadCount ?? 0,
      }));

      // ✅ store version when opening
      convVersionRef.current[convId] = row.conversationUpdatedAt ?? "";
      return;
    }

    // If somehow row has no convId, open a draft
    setSelectedConversationId(makeDraftConvId(row.peer.type, row.peer.id));
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
    const peerType = selectedPeer?.type ?? "USER";
    const currentConvId =
      selectedConversationId ?? makeDraftConvId(peerType, selectedUserId);

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: optimisticId,
      senderId: "__me__",
      receiverId: peerType === "USER" ? selectedUserId : null,
      senderActorType: selectedActor.type,
      senderCommunityId:
        selectedActor.type === "COMMUNITY" ? selectedActor.communityId : null,
      receiverActorType: peerType,
      receiverCommunityId: peerType === "COMMUNITY" ? selectedUserId : null,
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

      const created = await ensureConversation(peerType, selectedUserId);
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
        if (prev.some((r) => r.peer.id === selectedUserId)) return prev;

        const nowIso = new Date().toISOString();

        const newRow: InboxRow = {
          peer: {
            type: peerType,
            id: selectedUserId,
            name: username,
            subtitle: peerType === "COMMUNITY" ? "Community page" : null,
            profilePic,
          },
          conversationId: realConvId,
          lastMessageAt: optimistic.createdAt,
          lastMessageText: `You: ${text}`,
          unreadCount: 0,
          conversationUpdatedAt: nowIso, // ✅ required by new type
        };

        // also set version ref
        convVersionRef.current[realConvId] = nowIso;

        return [newRow, ...prev];
      });
    }

    // send to server (real conversation)
    const res = await fetch(messageApi(`/api/connect/v1/messages/${realConvId}`), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).catch(() => null);

    if (!res) {
      markMessageStatus(realConvId, optimisticId, "failed");
      // persist only if real conversation exists
      if (!isDraftConvId(realConvId))
        safeUpsertPending(realConvId, { ...optimistic, status: "failed" });
      return;
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (json?.requiresVerification) setVerificationModalOpen(true);
      markMessageStatus(realConvId, optimisticId, "failed");
      if (!isDraftConvId(realConvId))
        safeUpsertPending(realConvId, { ...optimistic, status: "failed" });
      return;
    }

    const sent: ChatMessage | undefined = json?.data
      ? { ...json.data, status: "sent" }
      : undefined;

    if (!sent) {
      markMessageStatus(realConvId, optimisticId, "failed");
      if (!isDraftConvId(realConvId))
        safeUpsertPending(realConvId, { ...optimistic, status: "failed" });
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
          ? {
              ...x,
              lastMessageText: `You: ${sent.text ?? ""}`,
              lastMessageAt: sent.createdAt,
              unreadCount: 0,
              // conversationUpdatedAt will come from server on next poll (fine)
            }
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

    const res = await fetch(messageApi(`/api/connect/v1/messages/${convId}`), {
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
      if (json?.requiresVerification) setVerificationModalOpen(true);
      markMessageStatus(convId, messageId, "failed");
      safeUpsertPending(convId, { ...target, status: "failed" });
      return;
    }

    const sent: ChatMessage | undefined = json?.data
      ? { ...json.data, status: "sent" }
      : undefined;

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

    const res = await fetch(messageApi(`/api/connect/v1/messages/${convId}/message/${messageId}`), {
      method: "DELETE",
      credentials: "include",
    });

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

    const res = await fetch(messageApi(`/api/connect/v1/messages/${convId}/clear`), {
      method: "DELETE",
      credentials: "include",
    });

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
    if (!convId)
      return {
        text: row.lastMessageText ?? null,
        time: row.lastMessageAt ?? null,
        isFailed: false,
      };

    const msgs = messagesByConvRef.current[convId] ?? [];
    if (!msgs.length)
      return {
        text: row.lastMessageText ?? null,
        time: row.lastMessageAt ?? null,
        isFailed: false,
      };

    const last = msgs[msgs.length - 1];
    if (!last)
      return {
        text: row.lastMessageText ?? null,
        time: row.lastMessageAt ?? null,
        isFailed: false,
      };

    const isFromPeer =
      row.peer.type === "COMMUNITY"
        ? last.senderActorType === "COMMUNITY" &&
          last.senderCommunityId === row.peer.id
        : (last.senderActorType ?? "USER") === "USER" &&
          last.senderId === row.peer.id;
    const isMine = last.senderId === "__me__" || !isFromPeer;

    if (isMine && last.status === "failed") {
      return {
        text: `(Failed) You: ${last.text ?? ""}`,
        time: last.createdAt ?? null,
        isFailed: true,
      };
    }
    if (isMine && last.status === "sending") {
      return {
        text: `(Sending…) You: ${last.text ?? ""}`,
        time: last.createdAt ?? null,
        isFailed: false,
      };
    }

    return {
      text: row.lastMessageText ?? null,
      time: row.lastMessageAt ?? null,
      isFailed: false,
    };
  }, []);

  const selectedInitialUnreadCount = useMemo(() => {
    if (!selectedConversationId) return 0;
    return initialUnreadByConv[selectedConversationId] ?? 0;
  }, [initialUnreadByConv, selectedConversationId]);

  return {
    activeActorKey,
    activeActorType: selectedActor.type,
    verificationModalOpen,
    setVerificationModalOpen,
    inbox,
    selectedUserId,
    selectedConversationId,
    selectedInitialUnreadCount,
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
