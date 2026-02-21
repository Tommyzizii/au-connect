"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { X, Search } from "lucide-react";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";

type ConnectionUser = {
  id: string;
  username: string;
  title: string | null;
  profilePic: string | null;
};

function Row({ u, onPick }: { u: ConnectionUser; onPick: (u: ConnectionUser) => void }) {
  const avatar = useResolvedMediaUrl(u.profilePic, "/default_profile.jpg");

  return (
    <button
      type="button"
      onClick={() => onPick(u)}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-left cursor-pointer"
    >
      <div className="relative w-10 h-10 shrink-0">
        <Image src={avatar} alt={u.username} fill className="rounded-full object-cover" />
      </div>
      <div className="min-w-0">
        <div className="font-medium text-gray-900 truncate">{u.username}</div>
        <div className="text-xs text-gray-500 truncate">{u.title ?? ""}</div>
      </div>
    </button>
  );
}

export default function NewMessageModal({
  open,
  onClose,
  onPickUser,
}: {
  open: boolean;
  onClose: () => void;
  onPickUser: (u: ConnectionUser) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<ConnectionUser[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;

    let ignore = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/connect/v1/connect/my-connections", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Failed to load connections");

        if (!ignore) setUsers((json?.data || []) as ConnectionUser[]);
      } catch (e: unknown) {
        if (!ignore) setError(e instanceof Error ? e.message : "Failed to load connections");
        if (!ignore) setUsers([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.username.toLowerCase().includes(q));
  }, [users, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* modal */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-xl shadow-lg border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold text-gray-900">New message</div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <div className="px-4 py-3 border-b">
          <div className="flex items-center gap-2 px-3 py-2 border rounded-full">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search connections..."
              className="ml-3 text-base md:text-sm text-gray-600 placeholder-gray-400 w-full border-none focus:outline-none bg-transparent"
            />
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2">
          {loading ? (
            <div className="p-4 text-sm text-gray-500">Loading...</div>
          ) : error ? (
            <div className="p-4 text-sm text-red-600">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No connections found.</div>
          ) : (
            filtered.map((u) => <Row key={u.id} u={u} onPick={onPickUser} />)
          )}
        </div>
      </div>
    </div>
  );
}
