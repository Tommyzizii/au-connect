"use client";

import { Check, Copy, Search, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MESSAGES_INBOX_API_PATH,
  MY_CONNECTIONS_API_PATH,
  SHARE_POST_API_PATH,
} from "@/lib/constants";
import Image from "next/image";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";

type Recipient = {
  id: string;
  username: string;
  title: string | null;
  profilePic: string | null;
};

function RecipientRow({
  recipient,
  selected,
  onToggle,
}: {
  recipient: Recipient;
  selected: boolean;
  onToggle: () => void;
}) {
  const avatarUrl = useResolvedMediaUrl(
    recipient.profilePic,
    "/default_profile.jpg",
  );

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors ${
        selected ? "bg-red-50" : "hover:bg-gray-50"
      }`}
    >
      <Image
        src={avatarUrl}
        alt={recipient.username}
        width={36}
        height={36}
        className="h-9 w-9 rounded-full object-cover"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-gray-900">
          {recipient.username}
        </span>
        <span className="block truncate text-xs text-gray-500">
          {recipient.title ?? ""}
        </span>
      </span>
      <span
        className={`flex h-5 w-5 items-center justify-center rounded border ${
          selected
            ? "border-red-500 bg-red-500 text-white"
            : "border-gray-300"
        }`}
      >
        {selected && <Check className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}

function openShareWindow(url: string) {
  const width = 600;
  const height = 640;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  window.open(url, "_blank", `width=${width},height=${height},left=${left},top=${top},noopener,noreferrer`);
}

function updatePostCount(data: unknown, postId: string, shareCount: number): unknown {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map((item) => updatePostCount(item, postId, shareCount));

  const record = data as Record<string, unknown>;
  const updated: Record<string, unknown> = { ...record };

  if (record.id === postId) updated.shareCount = shareCount;
  for (const key of ["pages", "posts", "data"]) {
    if (key in record) updated[key] = updatePostCount(record[key], postId, shareCount);
  }
  return updated;
}

export default function ShareModal({
  isOpen,
  onClose,
  shareUrl,
  postId,
}: {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  postId?: string;
}) {
  const queryClient = useQueryClient();
  const resolvedPostId = postId ?? shareUrl.match(/\/share\/posts\/([^/?#]+)/)?.[1];
  const [copied, setCopied] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const actionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !resolvedPostId) return;
    let ignore = false;
    setLoading(true);
    setError("");
    Promise.all([
      fetch(MY_CONNECTIONS_API_PATH, { credentials: "include", cache: "no-store" }),
      fetch(MESSAGES_INBOX_API_PATH, { credentials: "include", cache: "no-store" }),
    ])
      .then(async ([connectionsResponse, inboxResponse]) => {
        const connectionsJson = await connectionsResponse.json().catch(() => ({}));
        const inboxJson = await inboxResponse.json().catch(() => ({}));
        if (!connectionsResponse.ok) {
          throw new Error(connectionsJson?.error || "Failed to load connections");
        }
        const combined = [
          ...(connectionsJson?.data || []),
          ...(inboxResponse.ok ? (inboxJson?.data || []).map((row: { user: Recipient }) => row.user) : []),
        ] as Recipient[];
        const unique = Array.from(new Map(combined.map((recipient) => [recipient.id, recipient])).values());
        if (!ignore) setRecipients(unique);
      })
      .catch((caught) => {
        if (!ignore) setError(caught instanceof Error ? caught.message : "Failed to load connections");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => { ignore = true; };
  }, [isOpen, resolvedPostId]);

  const filteredRecipients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? recipients.filter((recipient) =>
          `${recipient.username} ${recipient.title ?? ""}`.toLowerCase().includes(normalized),
        )
      : recipients;
  }, [query, recipients]);

  if (!isOpen) return null;

  const toggleRecipient = (id: string) => {
    actionKeyRef.current = null;
    setError("");
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selected) => selected !== id) : [...current, id],
    );
  };

  const sendInternally = async () => {
    if (!resolvedPostId || !selectedIds.length || sending) return;
    const idempotencyKey = actionKeyRef.current ?? crypto.randomUUID();
    actionKeyRef.current = idempotencyKey;
    setSending(true);
    setError("");
    try {
      const response = await fetch(SHARE_POST_API_PATH(resolvedPostId), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientIds: selectedIds, idempotencyKey }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || "Failed to share post");
      for (const key of ["posts", "profilePosts", "profileJobPosts", "community-posts", "community-profile-posts", "post"]) {
        queryClient.setQueriesData({ queryKey: [key] }, (old) =>
          updatePostCount(old, resolvedPostId, json.shareCount),
        );
      }
      actionKeyRef.current = null;
      setSelectedIds([]);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to share post");
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy link");
    }
  };

  const encoded = encodeURIComponent(shareUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Share Post</h3>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {resolvedPostId && (
          <section className="border-b p-5">
            <h4 className="mb-3 text-sm font-semibold text-gray-900">Send in AU Connect</h4>
            <div className="mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 transition focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100">
              <Search className="h-4 w-4 text-gray-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search connections" className="w-full bg-transparent text-sm outline-none" />
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {loading ? (
                <p className="p-3 text-sm text-gray-500">Loading connections…</p>
              ) : filteredRecipients.length ? (
                filteredRecipients.map((recipient) => {
                  const selected = selectedIds.includes(recipient.id);
                  return <RecipientRow key={recipient.id} recipient={recipient} selected={selected} onToggle={() => toggleRecipient(recipient.id)} />;
                })
              ) : (
                <p className="p-3 text-sm text-gray-500">No connections found.</p>
              )}
            </div>
            <button type="button" onClick={sendInternally} disabled={!selectedIds.length || sending} className="mt-4 w-full rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50">
              {sending ? "Sending…" : `Send${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
            </button>
          </section>
        )}

        <section className="p-5">
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encoded}`)} className="flex items-center justify-center gap-2 rounded-lg bg-[#1877F2] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#166fe0]">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
              Facebook
            </button>
            <button type="button" onClick={() => openShareWindow(`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`)} className="flex items-center justify-center gap-2 rounded-lg bg-[#0A66C2] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#095196]">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              LinkedIn
            </button>
          </div>
          <button type="button" onClick={handleCopy} className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors ${copied ? "bg-green-500" : "bg-red-500 hover:bg-red-600"}`}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy link"}
          </button>
        </section>
        {error && <p className="border-t bg-red-50 px-5 py-3 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}
