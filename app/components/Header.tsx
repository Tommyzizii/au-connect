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
} from "@/lib/constants";
import { fetchUser, handleLogout } from "../(main)/profile/utils/fetchfunctions";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import { useFeedStore } from "@/lib/stores/feedStore";
import { buildSlug } from "@/app/(main)/profile/utils/buildSlug";
import PopupModal from "./PopupModal";
import { fetchUnreadCount } from "@/lib/notifications";

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

// Search result item
const SearchResultItem = ({ user, onClick }: any) => {
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
        {user.title && (
          <p className="text-xs text-gray-500">{user.title}</p>
        )}
      </div>
    </button>
  );
};

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState("");
  const [openResults, setOpenResults] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
  });

  const { data: searchResults = [], isFetching } = useQuery({
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
    queryKey: ["notifications-unread-count"],
    queryFn: fetchUnreadCount,
    refetchInterval: 60_000,
  });

  const unreadCount = unreadData?.count ?? 0;

  const resolvedProfilePicUrl = useResolvedMediaUrl(
    user?.profilePic,
    "/default_profile.jpg",
  );

  const navBarIndicatedPages = [
    MAIN_PAGE_PATH,
    CONNECT_PAGE_PATH,
    MESSAGES_PAGE_PATH,
    NOTIFICATION_PAGE_PATH,
    PROFILE_PAGE_PATH,
  ];

  const currentPage = navBarIndicatedPages.includes(pathname)
    ? pathname
    : "not-valid-path";

  const hidden = [SIGNIN_PAGE_PATH, ONBOARD_PAGE_PATH].includes(pathname);
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
                    searchResults.map((u: any) => {
                      const userSlug =
                        u.slug || buildSlug(u.username, u.id);

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
                    <div className="p-3 text-sm text-gray-500">
                      No results
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* NAV */}
          <nav className="hidden md:flex items-center gap-6">
            {[
              { href: MAIN_PAGE_PATH, icon: <Home />, label: "Home" },
              { href: CONNECT_PAGE_PATH, icon: <UserPlus />, label: "Connect" },
              {
                href: MESSAGES_PAGE_PATH,
                icon: <MessageCircleMore />,
                label: "Messaging",
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
            ].map((item, i) => (
              <Link
                key={i}
                href={item.href}
                onClick={() => {
                  if (item.href === NOTIFICATION_PAGE_PATH) {
                    refetchUnread();
                  }
                }}
                className={`flex flex-col items-center gap-1 hover:text-red-500 rounded-lg ${
                  currentPage === item.href
                    ? "text-red-500"
                    : "text-gray-600"
                }`}
                title={item.label}
              >
                {item.icon}
                <span className="text-xs">{item.label}</span>
              </Link>
            ))}

            {/* PROFILE + LOGOUT */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => user?.slug && router.push(`/profile/${user.slug}`)}
                disabled={userLoading}
              >
                <Image
                  src={resolvedProfilePicUrl}
                  alt="avatar"
                  width={38}
                  height={38}
                  className="rounded-full border-red-400 border-2 shadow-lg hover:transition-transform hover:scale-105 active:opacity-80 cursor-pointer"
                />
              </button>

              <button
                title="Logout"
                className="hover:bg-gray-100 rounded-lg p-3 ml-2 active:opacity-80 active:scale-95 transition cursor-pointer"
                onClick={() => setShowModal(true)}
              >
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </nav>

          {/* MOBILE MENU BUTTON */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

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
      </div>
    </header>
  );
}
