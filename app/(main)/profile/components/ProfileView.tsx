"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Pencil, Camera } from "lucide-react";

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
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import PopupModal from "@/app/components/PopupModal";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProfilePosts } from "../utils/fetchProfilePosts";
import { fetchProfileJobPosts } from "../utils/fetchProfileJobPosts";

import ConnectionsModal from "./ConnectionsModal";
import { useRouter } from "next/navigation";

import { useInfiniteScroll } from "../[slug]/hook/useInfiniteScroll";
import { setInvalidateProfilePosts } from "@/lib/services/uploadService";

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
  const queryClient = useQueryClient();
  const [userState, setUserState] = useState<User>(user);
  const [openContactInfo, setOpenContactInfo] = useState(false);
  const [tab, setTab] = useState<
    "all" | "article" | "poll" | "videos" | "images" | "documents" | "links"
  >("all");

  const TABS: Array<{ key: typeof tab; label: string }> = [
    { key: "all", label: "All" },
    { key: "article", label: "Articles" },
    { key: "poll", label: "Polls" },
    { key: "videos", label: "Videos" },
    { key: "images", label: "Images" },
    { key: "documents", label: "Documents" },
    { key: "links", label: "Links" },
  ];

  // ✅ NEW: Activity vs Job Activity (UI-only)
  type MainSection = "activity" | "jobActivity";
  type JobTab = "hiring" | "saved" | "applied";

  const [mainSection, setMainSection] = useState<MainSection>("activity");
  const [jobTab, setJobTab] = useState<JobTab>("hiring");

  const JOB_TABS: Array<{ key: JobTab; label: string; ownerOnly?: boolean }> = [
    { key: "hiring", label: "Hiring Posts" }, // public
    { key: "saved", label: "Saved Jobs", ownerOnly: true }, // private
    { key: "applied", label: "Applied Jobs", ownerOnly: true }, // private
  ];

  const [openModal, setOpenModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openExperienceModal, setOpenExperienceModal] = useState(false);
  const [openEducationModal, setOpenEducationModal] = useState(false);
  const [openAboutModal, setOpenAboutModal] = useState(false);

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
    user.coverPhoto || "/default_cover.jpg",
  );

  //  resolve URLs using hook (cached)
  const resolvedProfilePicUrl = useResolvedMediaUrl(
    profilePicValue,
    "/default_profile.jpg",
  );

  const resolvedCoverPhotoUrl = useResolvedMediaUrl(
    coverPhotoValue,
    "/default_cover.jpg",
  );

  // Connect button states
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [connectSuccess, setConnectSuccess] = useState(false); // "Requested"
  const [requestId, setRequestId] = useState<string | null>(null); // Store request ID for canceling
  const [incomingRequestId, setIncomingRequestId] = useState<string | null>(
    null,
  ); // ✅ NEW: for accept/decline
  const [openRemoveModal, setOpenRemoveModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false); // Track if already connected

  const router = useRouter();

  const [openConnectionsModal, setOpenConnectionsModal] = useState(false);
  const [connectionsList, setConnectionsList] = useState<any[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  useEffect(() => {
    console.log(user);
    console.log("Session user ID:", sessionUserId);
  }, [user, sessionUserId]);


  // ✅ OLD: profile posts (unchanged)
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

  // ✅ NEW: profile job posts (ONLY for Job Activity -> Hiring)
  const {
    data: jobPostData,
    isLoading: jobPostLoading,
    fetchNextPage: fetchNextJobPage,
    hasNextPage: hasNextJobPage,
    isFetchingNextPage: isFetchingNextJobPage,
  } = useInfiniteQuery({
    queryKey: ["profileJobPosts", user.id, jobTab],
    queryFn: ({ pageParam }) =>
      fetchProfileJobPosts({
        pageParam,
        userId: user.id,
        jobTab,
      }),
    enabled: !!user?.id && mainSection === "jobActivity",
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
  });

  // ✅ keep your invalidate logic unchanged (it still invalidates old posts; that's ok)
  useEffect(() => {
    setInvalidateProfilePosts(() => {
      queryClient.invalidateQueries({ queryKey: ["profilePosts"] });
      queryClient.invalidateQueries({ queryKey: ["profileJobPosts"] });
    });

    return () => {
      setInvalidateProfilePosts(() => { });
    };
  }, [queryClient]);

  // ✅ Decide which infinite-scroll pagination is ACTIVE (posts vs hiring posts)
  const usingJobSection = mainSection === "jobActivity";

  const activeHasNextPage = usingJobSection ? !!hasNextJobPage : !!hasNextPage;

  const activeIsFetchingNextPage = usingJobSection
    ? !!isFetchingNextJobPage
    : !!isFetchingNextPage;

  const activeFetchNextPage = usingJobSection ? fetchNextJobPage : fetchNextPage;

  // ✅ infinite scroll uses ACTIVE pagination
  const { rootRef, sentinelRef } = useInfiniteScroll({
    enabled: !!user?.id,
    hasNextPage: activeHasNextPage,
    isFetchingNextPage: activeIsFetchingNextPage,
    fetchNextPage: activeFetchNextPage,
  });

  // ✅ OLD: profile posts list (unchanged)
  const tabPosts: PostType[] =
    postData?.pages.flatMap((page: { posts: PostType[] }) => page.posts) ?? [];

  // ✅ NEW: hiring posts list
  const hiringPosts: PostType[] =
    jobPostData?.pages.flatMap((page: { posts: PostType[] }) => page.posts) ??
    [];

  const isPostsLoading = profilePostLoading;
  const isHiringLoading = jobPostLoading;

  // ✅ UPDATED: On profile load: check connection status (connected / outgoing / incoming)
  useEffect(() => {
    if (isOwner) return;

    let ignore = false;

    async function loadConnectionStatus() {
      try {
        // 1) connected?
        const connectionsRes = await fetch(
          "/api/connect/v1/connect/status?otherUserId=" + user.id,
          { credentials: "include" },
        );

        if (connectionsRes.ok) {
          const connectionsJson = await connectionsRes.json();
          if (!ignore && connectionsJson.isConnected) {
            setIsConnected(true);
            // cleanup other states
            setConnectSuccess(false);
            setRequestId(null);
            setIncomingRequestId(null);
            return;
          }
        }

        // 2) outgoing request?
        const outgoingRes = await fetch(
          "/api/connect/v1/connect/requests?type=outgoing",
          { credentials: "include" },
        );
        if (outgoingRes.ok) {
          const outgoingJson = await outgoingRes.json();
          const outgoing = (outgoingJson.data || []) as any[];

          const existingOutgoing = outgoing.find(
            (r) => r.toUserId === user.id || r.toUser?.id === user.id,
          );

          if (!ignore && existingOutgoing) {
            setIsConnected(false);
            setConnectSuccess(true);
            setRequestId(existingOutgoing.id);
            setIncomingRequestId(null);
            return; // important
          }
        }

        // 3) incoming request?
        const incomingRes = await fetch(
          "/api/connect/v1/connect/requests?type=incoming",
          { credentials: "include" },
        );
        if (incomingRes.ok) {
          const incomingJson = await incomingRes.json();
          const incoming = (incomingJson.data || []) as any[];

          const existingIncoming = incoming.find(
            (r) => r.fromUserId === user.id || r.fromUser?.id === user.id,
          );

          if (!ignore && existingIncoming) {
            setIsConnected(false);
            setConnectSuccess(false);
            setRequestId(null);
            setIncomingRequestId(existingIncoming.id);
            return;
          }
        }

        // 4) none
        if (!ignore) {
          setIsConnected(false);
          setConnectSuccess(false);
          setRequestId(null);
          setIncomingRequestId(null);
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
      setIncomingRequestId(null); // ✅ make sure UI doesn't show accept/decline
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
          credentials: "include",
        },
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

  async function handleAcceptIncoming() {
    if (!incomingRequestId) return;

    try {
      setConnectError(null);
      setConnectLoading(true);

      const res = await fetch(
        `/api/connect/v1/connect/request/${incomingRequestId}/accept`,
        { method: "POST", credentials: "include" },
      );

      if (!res.ok) throw new Error("Failed to accept request");

      setIncomingRequestId(null);
      setIsConnected(true);
    } catch (e: unknown) {
      setConnectError(e instanceof Error ? e.message : "Failed to accept request");
    } finally {
      setConnectLoading(false);
    }
  }

  async function handleDeclineIncoming() {
    if (!incomingRequestId) return;

    try {
      setConnectError(null);
      setConnectLoading(true);

      const res = await fetch(
        `/api/connect/v1/connect/request/${incomingRequestId}/decline`,
        { method: "POST", credentials: "include" },
      );

      if (!res.ok) throw new Error("Failed to decline request");

      setIncomingRequestId(null);
    } catch (e: unknown) {
      setConnectError(
        e instanceof Error ? e.message : "Failed to decline request",
      );
    } finally {
      setConnectLoading(false);
    }
  }

  async function handleRemoveConnection() {
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
                        className="absolute top-3 right-3 bg-white/80 p-2 rounded-full shadow cursor-pointer"
                        type="button"
                        aria-label="Edit cover photo"
                      >
                        <Camera size={18} className="text-gray-700" />
                      </button>
                    )}
                  </div>

                  <div className="relative p-4">
                    <div className="flex items-start justify-between gap-3 md:block">
                      <div className="relative -mt-16 w-32 h-32 z-10">
                        <button
                          type="button"
                          onClick={() => setOpenProfilePhotoModal(true)}
                          className="relative w-32 h-32 block cursor-pointer"
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

                      {/* EDIT / CONNECT BUTTONS */}
                      <div className="z-20 flex flex-col items-end gap-2 flex-1 min-w-0 md:mb-0 md:absolute md:top-4 md:right-4 md:w-auto">
                        <div className="flex flex-wrap justify-end items-center gap-2 md:gap-3 w-full md:w-auto">
                          {isOwner ? (
                            <button
                              onClick={() => setOpenEditModal(true)}
                              className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 border rounded-lg text-xs md:text-base text-gray-700 hover:bg-gray-50 shadow-sm bg-white cursor-pointer"
                            >
                              <Pencil size={14} className="md:w-4 md:h-4" />
                              Edit Profile
                            </button>
                          ) : (
                            <>
                              {/* ✅ UPDATED: Show different UI based on connection state */}
                              {isConnected ? (
                                <button
                                  onClick={() => setOpenRemoveModal(true)}
                                  disabled={connectLoading}
                                  className={`px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-base rounded-lg shadow text-white transition-colors bg-red-500 hover:bg-red-600 cursor-pointer ${connectLoading
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                    }`}
                                >
                                  {connectLoading ? "Removing..." : "Remove"}
                                </button>
                              ) : incomingRequestId ? (
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={handleAcceptIncoming}
                                    disabled={connectLoading}
                                    className={`px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg bg-blue-600 text-white text-xs md:text-base hover:bg-blue-700 cursor-pointer ${connectLoading
                                      ? "opacity-50 cursor-not-allowed"
                                      : ""
                                      }`}
                                  >
                                    {connectLoading ? "Accepting..." : "Accept"}
                                  </button>

                                  <button
                                    onClick={handleDeclineIncoming}
                                    disabled={connectLoading}
                                    className={`px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg bg-red-500 text-white text-xs md:text-base hover:bg-red-600 cursor-pointer ${connectLoading
                                      ? "opacity-50 cursor-not-allowed"
                                      : ""
                                      }`}
                                  >
                                    Decline
                                  </button>
                                </div>
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
                                    className={`px-3 py-2 rounded-lg border border-red-300 bg-white text-red-600 hover:bg-red-50 transition-colors text-sm font-medium cursor-pointer ${connectLoading
                                      ? "opacity-50 cursor-not-allowed"
                                      : ""
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
                                  className={`px-4 py-2 rounded-lg shadow text-white transition-colors bg-blue-600 hover:bg-blue-700 cursor-pointer ${connectLoading
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                    }`}
                                >
                                  {connectLoading ? "Sending..." : "Connect"}
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  router.push(`/messages?userId=${user.id}`)
                                }
                                className="px-3 py-1.5 md:px-4 md:py-2 border rounded-lg text-xs md:text-base text-gray-700 hover:bg-gray-50 shadow-sm bg-white cursor-pointer"
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
                      className="text-sm text-gray-600 hover:underline cursor-pointer"
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
                        className="p-1.5 md:p-2 rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                      >
                        <Pencil size={16} className="md:w-[18px] md:h-[18px]" />
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
                        className="p-1.5 md:p-2 rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                      >
                        <Pencil size={16} className="md:w-[18px] md:h-[18px]" />
                      </button>
                    )
                  }
                >
                  {education.length > 0 ? (
                    education.map((edu) => (
                      <EducationItem key={edu.id} {...edu} />
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">
                      No education added yet.
                    </p>
                  )}
                </SectionCard>

                {/* ABOUT */}
                <SectionCard
                  title="About"
                  icon={
                    isOwner && (
                      <button
                        onClick={() => setOpenAboutModal(true)}
                        className="p-2 rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
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
                <SectionCard title="Activities">
                  <p className="text-sm text-gray-600 mb-3">
                    {user.connections} connections
                  </p>

                  {/* ✅ NEW: Activity vs Job Activity switch */}
                  <div className="flex gap-4 border-b pb-2">
                    <button
                      onClick={() => {
                        setMainSection("activity");
                      }}
                      className={`pb-2 cursor-pointer ${mainSection === "activity"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600"
                        }`}
                    >
                      Social Activity
                    </button>

                    <button
                      onClick={() => {
                        setMainSection("jobActivity");
                        setJobTab("hiring"); // nicer UX default
                      }}
                      className={`pb-2 cursor-pointer ${mainSection === "jobActivity"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600"
                        }`}
                    >
                      Job Activity
                    </button>
                  </div>

                  {/* ✅ Tabs row changes based on mainSection */}
                  {mainSection === "activity" ? (
                    <div
                      className="
                          mt-2 border-b
                          overflow-x-auto whitespace-nowrap
                          [-webkit-overflow-scrolling:touch]
                          scrollbar-hide
                          "
                    >
                      <div className="flex gap-4 pb-2 min-w-max">
                        {TABS.map((t) => (
                          <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`pb-2 flex-shrink-0 cursor-pointer ${tab === t.key
                              ? "border-b-2 border-blue-600 text-blue-600"
                              : "text-gray-600"
                              }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="
    mt-2 border-b
    overflow-x-auto whitespace-nowrap
    [-webkit-overflow-scrolling:touch]
    scrollbar-hide
  "
                    >
                      <div className="flex gap-4 pb-2 min-w-max">
                        {JOB_TABS.filter((t) => !t.ownerOnly || isOwner).map((t) => (
                          <button
                            key={t.key}
                            onClick={() => setJobTab(t.key)}
                            className={`pb-2 flex-shrink-0 cursor-pointer ${jobTab === t.key
                              ? "border-b-2 border-blue-600 text-blue-600"
                              : "text-gray-600"
                              }`}
                          >
                            {t.label}
                            {t.ownerOnly && (
                              <span
                                className="ml-1 text-xs text-gray-400 cursor-help"
                                title="Only you can see this Section"
                                aria-label="Only you can see this Section"
                              >
                                🔒
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ✅ Content changes based on mainSection */}
                  <div className="mt-4 space-y-4">
                    {mainSection === "activity" ? (
                      <>
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

                            {hasNextPage && (
                              <div ref={sentinelRef} className="h-1" />
                            )}

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
                      </>
                    ) : (
                      <>
                        {!isOwner && (jobTab === "saved" || jobTab === "applied") ? (
                          <div className="text-center text-sm text-gray-600 py-10">
                            This section is private.
                          </div>
                        ) : (
                          <>
                            {isHiringLoading ? (
                              <>
                                <Post isLoading={true} />
                                <Post isLoading={true} />
                              </>
                            ) : hiringPosts.length > 0 ? (
                              <>
                                {hiringPosts.map((p: PostType) => (
                                  <Post
                                    key={p.id}
                                    post={p}
                                    isLoading={false}
                                    user={sessionUser ?? undefined}
                                  />
                                ))}

                                {hasNextJobPage && (
                                  <div ref={sentinelRef} className="h-1" />
                                )}

                                {isFetchingNextJobPage && (
                                  <div className="text-center text-sm text-gray-500 pt-2">
                                    Loading...
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-center text-gray-600 py-10">
                                {jobTab === "hiring"
                                  ? "No hiring posts yet"
                                  : jobTab === "saved"
                                    ? "No saved jobs yet"
                                    : "No applied jobs yet"}
                              </div>
                            )}
                          </>
                        )}
                      </>
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
                    className="mt-4 text-sm text-blue-600 font-semibold cursor-pointer"
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

      <PopupModal
        open={openRemoveModal}
        onClose={() => setOpenRemoveModal(false)}
        onConfirm={() => {
          setOpenRemoveModal(false);
          handleRemoveConnection();
        }}
        title="Remove Connection"
        titleText="Are you sure you want to remove this connection? You will need to send a new request to connect again."
        actionText="Remove"
      />
    </>
  );
}
