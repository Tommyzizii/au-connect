"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type IncomingRequest = {
  id: string;
  fromUserId: string;
  createdAt: string;
  fromUser?: {
    id: string;
    username: string;
    title?: string;
    profilePic?: string;
    location?: string;
  };
};

export default function ConnectPage() {
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null); // disable buttons per row

  useEffect(() => {
    let ignore = false;

    async function loadIncoming() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          "/api/connect/v1/connect/requests?type=incoming",
          { credentials: "include" }
        );

        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load requests");

        if (!ignore) setRequests(json.data || []);
      } catch (e: unknown) {
        if (!ignore) setError(e instanceof Error ? e.message : "Server error");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadIncoming();

    return () => {
      ignore = true;
    };
  }, []);

  // Decline => call /request/[id]/decline then remove from UI
  async function handleDecline(requestId: string) {
    try {
      setError(null);
      setActingId(requestId);

      const res = await fetch(
        `/api/connect/v1/connect/request/${requestId}/decline`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to decline request");

      // ✅ pop out from connects page
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Server error");
    } finally {
      setActingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="w-full px-10 py-10">
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-lg font-bold text-neutral-800 tracking-tight">
              Connect Requests
            </h2>

            {requests.length > 0 && (
              <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                {requests.length} new
              </span>
            )}
          </div>

          {loading && (
            <p className="text-neutral-500 text-sm">Loading requests...</p>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          {!loading && !error && requests.length === 0 && (
            <div className="py-20 text-center">
              <h3 className="text-lg font-semibold text-neutral-800">
                No connection requests
              </h3>
              <p className="text-sm text-neutral-500 mt-2">
                When someone sends you a connection request, it will appear here.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {requests.map((req) => {
              const u = req.fromUser;

              return (
                <div
                  key={req.id}
                  className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-neutral-50 to-neutral-100/50 p-6 border border-neutral-200/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                >
                  <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left */}
                    <div className="flex items-start md:items-center gap-4">
                      <div className="relative">
                        <div className="relative h-20 w-20 rounded-2xl overflow-hidden ring-2 ring-neutral-200 group-hover:ring-blue-400 transition-all duration-300">
                          <Image
                            src={u?.profilePic || "/default_profile.jpg"}
                            alt={u?.username || "User"}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-500 rounded-full border-4 border-white" />
                      </div>

                      <div className="text-sm space-y-1">
                        <div className="font-bold text-neutral-900 text-base">
                          {u?.username || "Unknown user"}
                        </div>
                        <div className="text-neutral-600 font-medium">
                          {u?.title || "AU Member"}
                        </div>
                        {u?.location && (
                          <div className="text-neutral-500 text-xs">
                            {u.location}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-3 ml-auto">
                      {/* Accept later */}
                      <button
                        disabled={actingId === req.id}
                        className="rounded-xl bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Accept
                      </button>

                      <button
                        onClick={() => handleDecline(req.id)}
                        disabled={actingId === req.id}
                        className="rounded-xl bg-neutral-200 hover:bg-neutral-300 px-6 py-2.5 text-sm font-semibold text-neutral-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {actingId === req.id ? "Declining..." : "Decline"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
