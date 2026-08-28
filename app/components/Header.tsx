"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Home,
  UserPlus,
  Bell,
  Search,
  Menu,
  X,
  MessageCircleMore,
  LogOut,
  BriefcaseBusiness,
  ChevronDown,
  Check,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";

import {
  CONNECT_PAGE_PATH,
  MAIN_PAGE_PATH,
  NOTIFICATION_PAGE_PATH,
  SIGNIN_PAGE_PATH,
  ONBOARD_PAGE_PATH,
  MESSAGES_PAGE_PATH,
  PROFILE_PAGE_PATH,
  JOBS_PAGE_PATH,
  MY_MANAGED_COMMUNITIES_API_PATH,
  COMMUNITY_PAGE_PATH,
  ACCOUNT_VERIFICATION_PAGE_PATH,
  ACCOUNT_RESTRICTED_PAGE_PATH,
} from "@/lib/constants";
import {
  fetchUser,
  handleLogout,
} from "../(main)/profile/utils/fetchfunctions";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import { useFeedStore } from "@/lib/stores/feedStore";
import { buildSlug } from "@/app/(main)/profile/utils/buildSlug";
import PopupModal from "./PopupModal";
import { fetchUnreadCount } from "@/lib/client/notifications.client";
import { fetchUnreadMessagesCount } from "@/lib/headerMessaging";
import { useActorStore } from "@/lib/stores/actorStore";
import VerificationRequiredModal from "./VerificationRequiredModal";

type SearchUser = {
  id: string;
  username: string;
  slug?: string;
  title?: string | null;
  profilePic?: string | null;
};

// Search result item
const SearchResultItem = ({
  user,
  onClick,
}: {
  user: SearchUser;
  onClick: () => void;
}) => {
  const resolvedProfilePic = useResolvedMediaUrl(
    user.profilePic,
    "/default_profile.jpg",
  );

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 text-left"
    >
      <Image
        src={resolvedProfilePic}
        alt={user.username}
        width={36}
        height={36}
        className="rounded-full object-cover"
      />
      <div>
        <p className="text-sm font-medium text-gray-900">{user.username}</p>
        {user.title && <p className="text-xs text-gray-500">{user.title}</p>}
      </div>
    </button>
  );
};

type ManagedCommunity = {
  id: string;
  name: string;
  slug: string;
  profilePic: string | null;
  coverPhoto: string | null;
  status: "ACTIVE" | "ARCHIVED";
};

const ActorAvatar = ({
  src,
  alt,
  className = "",
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) => {
  const resolvedSrc = useResolvedMediaUrl(src, "/default_profile.jpg");

  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      width={38}
      height={38}
      className={`rounded-full object-cover ${className}`}
    />
  );
};

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState("");
  const [openResults, setOpenResults] = useState(false);
  const [actorMenuOpen, setActorMenuOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);

  const pathnameRaw = usePathname();
  const pathname = pathnameRaw ?? "";
  const router = useRouter();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
  });

  const selectedActor = useActorStore((s) => s.selectedActor);
  const selectUserActor = useActorStore((s) => s.useUserActor);
  const selectCommunityActor = useActorStore((s) => s.useCommunityActor);

  const { data: managedCommunities = [] } = useQuery<ManagedCommunity[]>({
    queryKey: ["managed-communities"],
    queryFn: async () => {
      const res = await fetch(MY_MANAGED_COMMUNITIES_API_PATH);
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json.communities) ? json.communities : [];
    },
    enabled: !!user,
  });

  const { data: msgUnreadData } = useQuery({
    queryKey: ["messages-unread-count"],
    queryFn: fetchUnreadMessagesCount,
    refetchInterval: 4000,
  });
  const msgUnreadCount = msgUnreadData?.count ?? 0;

  const { data: searchResults = [], isFetching } = useQuery<SearchUser[]>({
    queryKey: ["search-users", query],
    queryFn: async () => {
      const res = await fetch(
        `/api/connect/v1/search/users?q=${encodeURIComponent(query)}`,
      );
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: query.length >= 2,
  });

  // 🔔 unread notifications
  const { data: unreadData, refetch: refetchUnread } = useQuery({
    queryKey: ["notifications-unread-count", selectedActor],
    queryFn: fetchUnreadCount,
    refetchInterval: 60_000,
  });

  const unreadCount = unreadData?.count ?? 0;

  const activeCommunity =
    selectedActor.type === "COMMUNITY"
      ? managedCommunities.find(
          (community) => community.id === selectedActor.communityId,
        )
      : null;
  const activeActorName = activeCommunity?.name ?? user?.username ?? "Profile";
  const activeActorPic = activeCommunity
    ? activeCommunity.profilePic || "/default_profile.jpg"
    : user?.profilePic;
  const isAccountVerified = user?.accountVerificationStatus === "APPROVED";

  const handleSelectCommunityActor = (communityId: string) => {
    if (!isAccountVerified) {
      setActorMenuOpen(false);
      setMobileMenuOpen(false);
      setVerificationModalOpen(true);
      return;
    }

    selectCommunityActor(communityId);
    setActorMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const navBarIndicatedPages = [
    MAIN_PAGE_PATH,
    CONNECT_PAGE_PATH,
    JOBS_PAGE_PATH,
    COMMUNITY_PAGE_PATH,
    MESSAGES_PAGE_PATH,
    NOTIFICATION_PAGE_PATH,
    PROFILE_PAGE_PATH,
  ];

  const currentPage = navBarIndicatedPages.includes(pathname)
    ? pathname
    : "not-valid-path";

  const knownStaticPages = [
    MAIN_PAGE_PATH,
    CONNECT_PAGE_PATH,
    JOBS_PAGE_PATH,
    COMMUNITY_PAGE_PATH,
    MESSAGES_PAGE_PATH,
    NOTIFICATION_PAGE_PATH,
    PROFILE_PAGE_PATH,
    SIGNIN_PAGE_PATH,
    ONBOARD_PAGE_PATH,
    ACCOUNT_VERIFICATION_PAGE_PATH,
    ACCOUNT_RESTRICTED_PAGE_PATH,
  ];
  const knownDynamicPagePatterns = [
    /^\/community\/[^/]+$/,
    /^\/posts\/[^/]+$/,
    /^\/profile\/[^/]+$/,
    /^\/applicants\/[^/]+$/,
    /^\/applications\/[^/]+\/[^/]+$/,
    /^\/share\/posts\/[^/]+$/,
  ];
  const isKnownPage =
    knownStaticPages.includes(pathname) ||
    knownDynamicPagePatterns.some((pattern) => pattern.test(pathname));

  const desktopNavItems = [
    { href: MAIN_PAGE_PATH, icon: <Home />, label: "Home" },
    {
      href: CONNECT_PAGE_PATH,
      icon: <UserPlus />,
      label: "Connect",
      hideInCommunityMode: true,
    },
    {
      href: JOBS_PAGE_PATH,
      icon: <BriefcaseBusiness />,
      label: "Jobs",
      hideInCommunityMode: true,
    },
    {
      href: COMMUNITY_PAGE_PATH,
      icon: <UsersRound />,
      label: "Community",
    },
    {
      href: MESSAGES_PAGE_PATH,
      label: "Messaging",
      icon: (
        <div className="relative">
          <MessageCircleMore />
          {msgUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
              {msgUnreadCount > 9 ? "9+" : msgUnreadCount}
            </span>
          )}
        </div>
      ),
    },
    {
      href: NOTIFICATION_PAGE_PATH,
      label: "Notification",
      icon: (
        <div className="relative">
          <Bell />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      ),
    },
  ].filter((item) => !(activeCommunity && item.hideInCommunityMode));

  const mobileNavItems = [
    { href: MAIN_PAGE_PATH, icon: <Home className="w-5 h-5" />, label: "Home" },
    {
      href: CONNECT_PAGE_PATH,
      icon: <UserPlus className="w-5 h-5" />,
      label: "Connect",
      hideInCommunityMode: true,
    },
    {
      href: MESSAGES_PAGE_PATH,
      icon: <MessageCircleMore className="w-5 h-5" />,
      label: "Messaging",
    },
    {
      href: COMMUNITY_PAGE_PATH,
      icon: <UsersRound className="w-5 h-5" />,
      label: "Community",
    },
    {
      href: NOTIFICATION_PAGE_PATH,
      icon: <Bell className="w-5 h-5" />,
      label: "Notifications",
    },
  ].filter((item) => !(activeCommunity && item.hideInCommunityMode));

  const hidden =
    [SIGNIN_PAGE_PATH, ONBOARD_PAGE_PATH].includes(pathname) ||
    pathname.startsWith("/share") ||
    !isKnownPage;
  const scrollFeedToTop = useFeedStore((s) => s.scrollToTop);

  if (hidden) return null;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => {
              if (currentPage === MAIN_PAGE_PATH) {
                scrollFeedToTop();
              } else {
                router.push(MAIN_PAGE_PATH);
              }
            }}
            className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-1"
          >
            <Image
              src="/au-connect-logo.png"
              width={45}
              height={45}
              alt="logo"
            />
            <h1 className="text-2xl font-bold text-gray-900">AU Connect</h1>
          </div>

          {/* 🔍 DESKTOP SEARCH */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpenResults(true);
                }}
                onBlur={() => setTimeout(() => setOpenResults(false), 150)}
                type="text"
                placeholder="Search"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 text-gray-600 rounded-full focus:outline-none focus:border-red-400"
              />

              {openResults && query.length >= 2 && (
                <div className="absolute top-full mt-2 w-full bg-white border rounded-lg shadow-lg z-50">
                  {isFetching ? (
                    <div className="p-3 text-sm text-gray-500">
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((u) => {
                      const userSlug = u.slug || buildSlug(u.username, u.id);

                      return (
                        <SearchResultItem
                          key={u.id}
                          user={u}
                          onClick={() => {
                            router.push(`/profile/${userSlug}`);
                            setQuery("");
                            setOpenResults(false);
                          }}
                        />
                      );
                    })
                  ) : (
                    <div className="p-3 text-sm text-gray-500">No results</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* NAV */}
          <nav className="hidden md:flex items-center gap-6">
            {desktopNavItems.map((item, i) => (
              <Link
                key={i}
                href={item.href}
                onClick={() => {
                  if (item.href === NOTIFICATION_PAGE_PATH) {
                    refetchUnread();
                  }
                }}
                className={`flex flex-col items-center gap-1 hover:text-red-500 rounded-lg ${
                  currentPage === item.href ? "text-red-500" : "text-gray-600"
                }`}
                title={item.label}
              >
                {item.icon}
                <span className="text-xs">{item.label}</span>
              </Link>
            ))}

            {/* PROFILE + LOGOUT */}
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <button
                  onClick={() => {
                    if (activeCommunity) {
                      router.push(`/community/${activeCommunity.slug}`);
                    } else if (user?.slug) {
                      router.push(`/profile/${user.slug}`);
                    }
                  }}
                  disabled={userLoading}
                  className="rounded-full"
                  title={activeActorName}
                >
                  <ActorAvatar
                    src={activeActorPic}
                    alt={activeActorName}
                    className="border-red-400 border-2 shadow-lg hover:transition-transform hover:scale-105 active:opacity-80 "
                  />
                </button>

                {managedCommunities.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActorMenuOpen((open) => !open)}
                    className="ml-1 rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                    title="Switch profile"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                )}

                {actorMenuOpen && managedCommunities.length > 0 && (
                  <div className="absolute right-0 top-full mt-3 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl z-50">
                    <div className="border-b border-gray-100 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Use as
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        selectUserActor();
                        setActorMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <ActorAvatar
                        src={user?.profilePic}
                        alt={user?.username ?? "Profile"}
                        className="h-9 w-9"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {user?.username ?? "My profile"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Personal profile
                        </p>
                      </div>
                      {!activeCommunity && (
                        <Check className="h-4 w-4 text-red-500" />
                      )}
                    </button>

                    {managedCommunities.map((community) => (
                      <button
                        key={community.id}
                        type="button"
                        onClick={() => {
                          handleSelectCommunityActor(community.id);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                      >
                        <ActorAvatar
                          src={community.profilePic}
                          alt={community.name}
                          className="h-9 w-9"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {community.name}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            Community page
                          </p>
                        </div>
                        {activeCommunity?.id === community.id && (
                          <Check className="h-4 w-4 text-red-500" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                title="Logout"
                className="hover:bg-gray-100 rounded-lg p-3 ml-2 active:opacity-80 active:scale-95 transition "
                onClick={() => setShowModal(true)}
              >
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-gray-600 hover:text-red-600"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Search */}
        {pathname !== MESSAGES_PAGE_PATH && (
          <div className="md:hidden mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpenResults(true);
                }}
                onBlur={() => setTimeout(() => setOpenResults(false), 150)}
                type="text"
                placeholder="Search"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 text-gray-600 rounded-full focus:outline-none focus:border-red-400"
              />
              {openResults && query.length >= 2 && (
                <div className="absolute top-full mt-2 w-full bg-white border rounded-lg shadow-lg z-50">
                  {isFetching ? (
                    <div className="p-3 text-sm text-gray-500">
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((u) => {
                      const userSlug = u.slug || buildSlug(u.username, u.id);
                      return (
                        <SearchResultItem
                          key={u.id}
                          user={u}
                          onClick={() => {
                            router.push(`/profile/${userSlug}`);
                            setQuery("");
                            setOpenResults(false);
                            setMobileMenuOpen(false);
                          }}
                        />
                      );
                    })
                  ) : (
                    <div className="p-3 text-sm text-gray-500">No results</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
            <div className="flex flex-col gap-3">
              {mobileNavItems.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (item.href === NOTIFICATION_PAGE_PATH) refetchUnread();
                  }}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer ${
                    currentPage === item.href
                      ? "bg-red-50 text-red-500"
                      : "text-gray-600"
                  } hover:bg-red-50 hover:text-red-600`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowModal(true);
                }}
                className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 "
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>

              {managedCommunities.length > 0 && (
                <div className="mt-2 border-t border-gray-200 pt-3">
                  <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Use as
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      selectUserActor();
                      setMobileMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50"
                  >
                    <ActorAvatar
                      src={user?.profilePic}
                      alt={user?.username ?? "Profile"}
                      className="h-8 w-8"
                    />
                    <span className="font-medium">
                      {user?.username ?? "My profile"}
                    </span>
                    {!activeCommunity && (
                      <Check className="ml-auto h-4 w-4 text-red-500" />
                    )}
                  </button>
                  {managedCommunities.map((community) => (
                    <button
                      key={community.id}
                      type="button"
                      onClick={() => {
                        handleSelectCommunityActor(community.id);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50"
                    >
                      <ActorAvatar
                        src={community.profilePic}
                        alt={community.name}
                        className="h-8 w-8"
                      />
                      <span className="font-medium">{community.name}</span>
                      {activeCommunity?.id === community.id && (
                        <Check className="ml-auto h-4 w-4 text-red-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>
        )}

        <PopupModal
          title="Confirm Logout"
          titleText="Are you sure you want to log out?"
          actionText="Logout"
          open={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={() => {
            setShowModal(false);
            handleLogout(() => router.push(SIGNIN_PAGE_PATH));
          }}
        />

        <VerificationRequiredModal
          open={verificationModalOpen}
          onClose={() => setVerificationModalOpen(false)}
          action="switch to a community page"
        />
      </div>
    </header>
  );
}
