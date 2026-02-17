"use client";

import Image from "next/image";
import { use, useEffect, useState } from "react";
import { Pencil, Camera, X } from "lucide-react";

import SectionCard from "./SectionCard";
import ExperienceItem from "./ExperienceItem";
import EducationItem from "./EducationItem";
import RecommendedList from "./RecommendedList";
import RecommendedModal from "./RecommendedModal";
import EditProfileModal from "./EditProfileModal";
import ExperienceManagerModal from "./ExperienceManagerModal";
import EducationManagerModal from "./EducationManagerModal";
import EditAboutModal from "./EditAboutModal";
import ProfilePhotoModal from "./ProfilePhotoModal";
import CoverPhotoModal from "./CoverPhotoModal";
import ContactInfoModal from "./ContactInfoModal";
import Post from "@/app/components/Post";
import User from "@/types/User";
import Experience from "@/types/Experience";
import Education from "@/types/Education";
import PostType from "@/types/Post";
import { useResolvedMediaUrl } from "@/app/profile/utils/useResolvedMediaUrl";

import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchProfilePosts } from "../utils/fetchProfilePosts";

import ConnectionsModal from "./ConnectionsModal";
import { useRouter } from "next/navigation";

import { useInfiniteScroll } from "../[slug]/hook/useInfiniteScroll";

export default function ProfileView({
  user,
  recommendedPeople,
  isOwner,
  sessionUserId,
  sessionUser,
}: {
  user: User;
  recommendedPeople: Array<number>;
  isOwner: boolean;
  sessionUserId: string | null;
  sessionUser: Pick<User, "id" | "username" | "slug" | "profilePic"> | null;
}) {


  const [userState, setUserState] = useState<User>(user);
  const [openContactInfo, setOpenContactInfo] = useState(false);
  const [tab, setTab] = useState<"all" | "article" | "poll" | "videos" | "images" | "documents">("all");

  const TABS: Array<{ key: typeof tab; label: string }> = [
    { key: "all", label: "All" },
    { key: "article", label: "Articles" },
    { key: "poll", label: "Polls" },
    { key: "videos", label: "Videos" },
    { key: "images", label: "Images" },
    { key: "documents", label: "Documents" },
  ];

  const [openModal, setOpenModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openExperienceModal, setOpenExperienceModal] = useState(false);
  const [openEducationModal, setOpenEducationModal] = useState(false);
  const [openAboutModal, setOpenAboutModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [openProfilePhotoModal, setOpenProfilePhotoModal] = useState(false);
  const [openCoverPhotoModal, setOpenCoverPhotoModal] = useState(false);

  const [experience, setExperience] = useState<Experience[]>(
    user.experience ?? [],
  );
  const [education, setEducation] = useState<Education[]>(user.education ?? []);
  const [about, setAbout] = useState(user.about ?? "");

  //  local profile pic value so UI updates after upload/delete without refresh
  const [profilePicValue, setProfilePicValue] = useState<string>(
    user.profilePic || "/default_profile.jpg",
  );

  //  local cover value so UI updates after upload/delete without refresh
  const [coverPhotoValue, setCoverPhotoValue] = useState<string>(
    user.coverPhoto || "/default_cover.jpg"
  );

  //  resolve URLs using hook (cached)
  const resolvedProfilePicUrl = useResolvedMediaUrl(
    profilePicValue,
    "/default_profile.jpg",
  );

  const resolvedCoverPhotoUrl = useResolvedMediaUrl(
    coverPhotoValue,
    "/default_cover.jpg"
  );

  // Connect button states
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [connectSuccess, setConnectSuccess] = useState(false); // "Requested"
  const [requestId, setRequestId] = useState<string | null>(null); // Store request ID for canceling
  const [isConnected, setIsConnected] = useState(false); // Track if already connected

  const router = useRouter();

  const [openConnectionsModal, setOpenConnectionsModal] = useState(false);
  const [connectionsList, setConnectionsList] = useState<any[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  useEffect(() => {
    console.log(user);
    console.log("Session user ID:", sessionUserId);
  }, [user, sessionUserId]);


  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // ✅ CHANGED: queryKey includes tab + fetchProfilePosts receives tab
  const {
    data: postData,
    isLoading: profilePostLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["profilePosts", user.id, tab],
    queryFn: ({ pageParam }) =>
      fetchProfilePosts({ pageParam, userId: user.id, tab }),
    enabled: !!user?.id,

    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
  });

  // ✅ CHANGED: enable infinite scroll for ALL tabs (not only posts)
  const { rootRef, sentinelRef } = useInfiniteScroll({
    enabled: !!user?.id, // <-- key change
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  // ✅ CHANGED: server now returns correct posts for the selected tab
  const tabPosts: PostType[] =
    postData?.pages.flatMap((page: { posts: PostType[] }) => page.posts) ?? [];

  const isPostsLoading = loading || profilePostLoading;
  // On profile load: check connection status (connected or pending request)

  useEffect(() => {
    if (isOwner) return;

    let ignore = false;

    async function loadConnectionStatus() {
      try {
        // Check if already connected
        const connectionsRes = await fetch(
          "/api/connect/v1/connect/status?otherUserId=" + user.id,
          { credentials: "include" }
        );

        if (connectionsRes.ok) {
          const connectionsJson = await connectionsRes.json();
          if (!ignore && connectionsJson.isConnected) {
            setIsConnected(true);
            return; // If connected, don't check for pending requests
          }
        }

        // If not connected, check for pending outgoing request
        const requestsRes = await fetch(
          "/api/connect/v1/connect/requests?type=outgoing",
        );
        const requestsJson = await requestsRes.json();

        if (!requestsRes.ok) return;

        const outgoing = (requestsJson.data || []) as any[];
        const existingRequest = outgoing.find(
          (r) => r.toUserId === user.id || r.toUser?.id === user.id,
        );

        if (!ignore && existingRequest) {
          setConnectSuccess(true);
          setRequestId(existingRequest.id);
        }
      } catch {
        // ignore silently
      }
    }

    loadConnectionStatus();

    return () => {
      ignore = true;
    };
  }, [isOwner, user.id]);

  useEffect(() => {
    if (!openConnectionsModal) return;

    let ignore = false;

    async function loadConnections() {
      try {
        setConnectionsLoading(true);

        const res = await fetch(
          `/api/connect/v1/connect/connections?userId=${user.id}`,
          { credentials: "include" },
        );

        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.error || "Failed to load connections");

        if (!ignore) setConnectionsList(json.data || []);
      } catch {
        if (!ignore) setConnectionsList([]);
      } finally {
        if (!ignore) setConnectionsLoading(false);
      }
    }

    loadConnections();

    return () => {
      ignore = true;
    };
  }, [openConnectionsModal, user.id]);

  async function handleConnect() {
    try {
      setConnectError(null);
      setConnectLoading(true);

      const res = await fetch("/api/connect/v1/connect/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: user.id }),
      });

      const json = await res.json();

      if (!res.ok) {
        const msg = json?.error || "Failed to send connection request";
        if (msg.toLowerCase().includes("already")) setConnectSuccess(true);
        throw new Error(msg);
      }

      // success => Requested & store the request ID
      setConnectSuccess(true);
      if (json.request?.id) {
        setRequestId(json.request.id);
      }
    } catch (e: unknown) {
      setConnectError(e instanceof Error ? e.message : "Server error");
    } finally {
      setConnectLoading(false);
    }
  }

  async function handleCancelRequest() {
    if (!requestId) {
      setConnectError("No request to cancel");
      return;
    }

    try {
      setConnectError(null);
      setConnectLoading(true);

      const res = await fetch(
        `/api/connect/v1/connect/request/${requestId}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to cancel request");
      }

      //  success => reset to initial state
      setConnectSuccess(false);
      setRequestId(null);
    } catch (e: unknown) {
      setConnectError(e instanceof Error ? e.message : "Server error");
    } finally {
      setConnectLoading(false);
    }
  }

  async function handleRemoveConnection() {
    if (!confirm("Are you sure you want to remove this connection?")) {
      return;
    }

    try {
      setConnectError(null);
      setConnectLoading(true);

      const res = await fetch(`/api/connect/v1/connect/${user.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to remove connection");
      }

      // success => reset to not connected state
      setIsConnected(false);
    } catch (e: unknown) {
      setConnectError(e instanceof Error ? e.message : "Server error");
    } finally {
      setConnectLoading(false);
    }
  }

  return (
    <>
      {/* ✅ ADDED: make this component a real scroll area under Header */}
      <div className="flex flex-col flex-1 min-h-0">
        <div ref={rootRef} className="flex-1 min-h-0 overflow-y-auto">
          {/* ⬇️ YOUR ORIGINAL CONTENT STARTS (unchanged) */}
          <div className="max-w-7xl mx-auto px-4 py-6 overflow-y-auto">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-8 space-y-4">
                {/* PROFILE HEADER */}
                <div className="bg-white rounded-lg border overflow-hidden">
                  <div className="relative w-full aspect-[3/1] bg-gray-200">
                    <Image
                      src={resolvedCoverPhotoUrl}
                      alt="cover photo"
                      fill
                      className="object-cover"
                    />
                    {isOwner && (
                      <button
                        onClick={() => setOpenCoverPhotoModal(true)}
                        className="absolute top-3 right-3 bg-white/80 p-2 rounded-full shadow"
                        type="button"
                        aria-label="Edit cover photo"
                      >
                        <Camera size={18} className="text-gray-700" />
                      </button>
                    )}
                  </div>

                  <div className="relative p-4">
                    {/* EDIT / CONNECT BUTTONS */}
                    <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                      <div className="flex items-center gap-3">
                        {isOwner ? (
                          <button
                            onClick={() => setOpenEditModal(true)}
                            className="flex items-center gap-2 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 shadow-sm bg-white"
                          >
                            <Pencil size={16} />
                            Edit Profile
                          </button>
                        ) : (
                          <>
                            {/* IMPROVED: Show different UI based on connection state */}
                            {isConnected ? (
                              <button
                                onClick={handleRemoveConnection}
                                disabled={connectLoading}
                                className={`px-4 py-2 rounded-lg shadow text-white transition-colors bg-red-500 hover:bg-red-600 ${connectLoading ? "opacity-50 cursor-not-allowed" : ""
                                  }`}
                              >
                                {connectLoading ? "Removing..." : "Remove"}
                              </button>
                            ) : connectSuccess ? (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 border border-gray-300">
                                  <span className="text-sm font-medium text-gray-700">
                                    Requested
                                  </span>
                                </div>
                                <button
                                  onClick={handleCancelRequest}
                                  disabled={connectLoading}
                                  className={`px-3 py-2 rounded-lg border border-red-300 bg-white text-red-600 hover:bg-red-50 transition-colors text-sm font-medium ${connectLoading ? "opacity-50 cursor-not-allowed" : ""
                                    }`}
                                  title="Cancel request"
                                >
                                  {connectLoading ? "Canceling..." : "Cancel"}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={handleConnect}
                                disabled={connectLoading}
                                className={`px-4 py-2 rounded-lg shadow text-white transition-colors bg-blue-600 hover:bg-blue-700 ${connectLoading ? "opacity-50 cursor-not-allowed" : ""
                                  }`}
                              >
                                {connectLoading ? "Sending..." : "Connect"}
                              </button>
                            )}
                            <button
                              onClick={() => router.push(`/messages?userId=${user.id}`)}
                              className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 shadow-sm bg-white"
                            >
                              Message
                            </button>
                          </>
                        )}
                      </div>

                      {connectError && (
                        <p className="text-sm text-red-600">{connectError}</p>
                      )}
                    </div>

                    <div className="relative -mt-16 w-32 h-32">
                      <button
                        type="button"
                        onClick={() => setOpenProfilePhotoModal(true)}
                        className="relative w-32 h-32 block"
                        aria-label="Open profile photo"
                      >
                        <Image
                          src={resolvedProfilePicUrl}
                          alt="avatar"
                          fill
                          className="rounded-full border-4 border-white object-cover"
                        />

                        {isOwner && (
                          <span className="absolute bottom-1 right-1 bg-white/90 p-2 rounded-full shadow border">
                            <Camera size={18} className="text-gray-700" />
                          </span>
                        )}
                      </button>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mt-2">
                      {userState.username}
                    </h1>
                    <p className="text-gray-700">{userState.title}</p>

                    <p className="text-sm text-gray-600 mt-1">
                      {userState.location} ·{" "}
                      <button
                        type="button"
                        onClick={() => setOpenContactInfo(true)}
                        className="underline cursor-pointer"
                      >
                        Contact info
                      </button>
                    </p>

                    <button
                      onClick={() => setOpenConnectionsModal(true)}
                      className="text-sm text-gray-600 hover:underline"
                    >
                      {user.connections} connections
                    </button>
                  </div>
                </div>

                {/* EXPERIENCE */}
                <SectionCard
                  title="Experience"
                  icon={
                    isOwner && (
                      <button
                        onClick={() => setOpenExperienceModal(true)}
                        className="p-2 rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Pencil size={18} />
                      </button>
                    )
                  }
                >
                  {experience.length > 0 ? (
                    experience.map((exp) => (
                      <ExperienceItem key={exp.id} {...exp} />
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">
                      No experience added yet.
                    </p>
                  )}
                </SectionCard>

                {/* EDUCATION */}
                <SectionCard
                  title="Education"
                  icon={
                    isOwner && (
                      <button
                        onClick={() => setOpenEducationModal(true)}
                        className="p-2 rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Pencil size={18} />
                      </button>
                    )
                  }
                >
                  {education.length > 0 ? (
                    education.map((edu) => (
                      <EducationItem key={edu.id} {...edu} />
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No education added yet.</p>
                  )}
                </SectionCard>

                {/* ABOUT */}
                <SectionCard
                  title="About"
                  icon={
                    isOwner && (
                      <button
                        onClick={() => setOpenAboutModal(true)}
                        className="p-2 rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Pencil size={18} />
                      </button>
                    )
                  }
                >
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {about || "This user has not added an about section yet."}
                  </p>
                </SectionCard>

                {/* ACTIVITY */}
                <SectionCard title="Activity">
                  <p className="text-sm text-gray-600 mb-3">
                    {user.connections} connections
                  </p>

                  <div className="flex gap-4 border-b pb-2">
                    {TABS.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`pb-2 ${tab === t.key
                          ? "border-b-2 border-blue-600 text-blue-600"
                          : "text-gray-600"
                          }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>


                  <div className="mt-4 space-y-4">
                    {isPostsLoading ? (
                      <>
                        <Post isLoading={true} />
                        <Post isLoading={true} />
                      </>
                    ) : tabPosts.length > 0 ? (
                      <>
                        {tabPosts.map((p: PostType) => (
                          <Post
                            key={p.id}
                            post={p}
                            isLoading={false}
                            user={sessionUser ?? undefined}
                          />
                        ))}


                        {/* ✅ CHANGED: sentinel works for ALL tabs */}
                        {hasNextPage && <div ref={sentinelRef} className="h-1" />}

                        {isFetchingNextPage && (
                          <div className="text-center text-sm text-gray-500 pt-2">
                            Loading...
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center text-gray-600 py-10">
                        No {tab === "all" ? "posts" : tab} yet
                      </div>
                    )}
                  </div>
                </SectionCard>
              </div>

              {/* RIGHT SIDEBAR */}
              <div className="hidden lg:block col-span-4 space-y-4 sticky top-20">
                <div className="bg-white rounded-lg border p-4">
                  <h2 className="font-semibold text-gray-900 mb-3">
                    People you may be interested in
                  </h2>
                  <RecommendedList users={recommendedPeople} limit={4} />
                  <button
                    onClick={() => setOpenModal(true)}
                    className="mt-4 text-sm text-blue-600 font-semibold"
                  >
                    Show more
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* ⬆️ YOUR ORIGINAL CONTENT ENDS */}
        </div>
      </div>

      {/* MODALS */}
      <ConnectionsModal
        open={openConnectionsModal}
        loading={connectionsLoading}
        users={connectionsList}
        onClose={() => setOpenConnectionsModal(false)}
      />

      <RecommendedModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        users={recommendedPeople}
      />

      <EditProfileModal
        open={openEditModal}
        onClose={() => setOpenEditModal(false)}
        user={userState}
        onUserUpdated={(u) => setUserState((prev) => ({ ...prev, ...u }))}
      />

      <ExperienceManagerModal
        open={openExperienceModal}
        onClose={() => setOpenExperienceModal(false)}
        experiences={experience}
        setExperiences={setExperience}
      />

      <EducationManagerModal
        open={openEducationModal}
        onClose={() => setOpenEducationModal(false)}
        education={education}
        setEducation={setEducation}
      />

      <ContactInfoModal
        open={openContactInfo}
        onClose={() => setOpenContactInfo(false)}
        user={userState}
        isOwner={isOwner}
      />

      <EditAboutModal
        open={openAboutModal}
        onClose={() => setOpenAboutModal(false)}
        initialAbout={about}
        onSaved={(newAbout) => setAbout(newAbout)}
      />

      <ProfilePhotoModal
        open={openProfilePhotoModal}
        onClose={() => setOpenProfilePhotoModal(false)}
        isOwner={isOwner}
        user={user}
        resolvedProfilePicUrl={resolvedProfilePicUrl}
        onProfilePicChanged={(newProfilePicValue: string) =>
          setProfilePicValue(newProfilePicValue)
        }
      />

      {/* COVER PHOTO MODAL */}
      <CoverPhotoModal
        open={openCoverPhotoModal}
        onClose={() => setOpenCoverPhotoModal(false)}
        isOwner={isOwner}
        user={user}
        resolvedCoverPhotoUrl={resolvedCoverPhotoUrl}
        onCoverPhotoChanged={(newCover: string) => setCoverPhotoValue(newCover)}
      />
    </>
  );
}
