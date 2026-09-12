"use client";

import { Check, Copy, Link, Search, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MESSAGES_INBOX_API_PATH,
  MY_CONNECTIONS_API_PATH,
  SHARE_POST_API_PATH,
} from "@/lib/constants";
import Image from "next/image";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import { getShareRecipients, type ShareRecipient as Recipient } from "@/lib/shareRecipients";

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
        const unique = getShareRecipients(
          connectionsJson?.data,
          inboxResponse.ok ? inboxJson?.data : [],
        );
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
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl sm:max-w-xl lg:max-w-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-7 sm:py-5">
          <h3 className="text-lg font-semibold text-gray-900 sm:text-xl">Share Post</h3>
          <button type="button" onClick={onClose} className="rounded-full bg-gray-50 p-2 text-gray-500 transition-colors hover:bg-gray-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {resolvedPostId && (
          <section className="border-b border-gray-100 p-5 sm:px-7 sm:py-6">
            <h4 className="mb-3 text-sm font-semibold text-gray-900">Send in AU Connect</h4>
            <div className="mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 transition focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100">
              <Search className="h-4 w-4 text-gray-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search connections" className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none" />
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto sm:max-h-60">
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

        <section className="p-5 sm:px-7 sm:py-6">
          <h4 className="mb-4 text-sm font-semibold text-gray-900">Share this post via</h4>
          <div className="flex gap-6">
            <button type="button" onClick={() => openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encoded}`)} className="group flex min-w-16 flex-col items-center gap-2 rounded-lg text-xs font-medium text-gray-600 outline-none focus-visible:ring-2 focus-visible:ring-red-400">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-500 transition-colors group-hover:border-red-500 group-hover:bg-red-500 group-hover:text-white sm:h-14 sm:w-14">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
              </span>
              Facebook
            </button>
            <button type="button" onClick={() => openShareWindow(`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`)} className="group flex min-w-16 flex-col items-center gap-2 rounded-lg text-xs font-medium text-gray-600 outline-none focus-visible:ring-2 focus-visible:ring-red-400">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-500 transition-colors group-hover:border-red-500 group-hover:bg-red-500 group-hover:text-white sm:h-14 sm:w-14">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </span>
              LinkedIn
            </button>
          </div>
          <label htmlFor="share-post-link" className="mb-2 mt-6 block text-sm font-semibold text-gray-900">Or copy link</label>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100">
            <Link className="ml-1 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
            <input
              id="share-post-link"
              readOnly
              value={shareUrl}
              onFocus={(event) => event.target.select()}
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-600 outline-none"
            />
            <button type="button" onClick={handleCopy} className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-red-500 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 sm:px-4">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </section>
        {error && <p className="border-t bg-red-50 px-5 py-3 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}
