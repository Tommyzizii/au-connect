"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Home,
  UserPlus,
  PlusCircle,
  Bell,
  Search,
  Menu,
  X,
  MessageCircleMore,
  UserRound,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

import {
  CONNECT_PAGE_PATH,
  MAIN_PAGE_PATH,
  NOTIFICATION_PAGE_PATH,
  SIGNIN_PAGE_PATH,
  ONBOARD_PAGE_PATH,
  MESSAGES_PAGE_PATH,
  PROFILE_PAGE_PATH,
} from "@/lib/constants";
import { fetchUser, handleLogout } from "../profile/utils/fetchfunctions";
import LogoutModal from "./LogoutModal";
import { useResolvedMediaUrl } from "@/app/profile/utils/useResolvedMediaUrl";
import { useFeedStore } from "@/lib/stores/feedStore";

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const pathName = usePathname();
  const router = useRouter();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
  });

  //  resolved avatar (cached)
  const resolvedProfilePicUrl = useResolvedMediaUrl(
    user?.profilePic,
    "/default_profile.jpg"
  );

  const navBarIndicatedPages = [
    MAIN_PAGE_PATH,
    CONNECT_PAGE_PATH,
    MESSAGES_PAGE_PATH,
    NOTIFICATION_PAGE_PATH,
    PROFILE_PAGE_PATH,
  ];

  const currentPage = navBarIndicatedPages.includes(pathName)
    ? pathName
    : "not-valid-path";

  const hidden = [SIGNIN_PAGE_PATH, ONBOARD_PAGE_PATH].includes(pathName);

  const handleProfileClick = () => {
    if (!user?.slug) return; // prevent runtime crash
    router.push(`/profile/${user.slug}`);
  };

  const scrollFeedToTop = useFeedStore((s) => s.scrollToTop);

  return hidden ? null : (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Top Section */}
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={scrollFeedToTop}
            className="flex items-center gap-3 cursor-pointer"
          >
            <Image
              src="/au-connect-logo.png"
              width={45}
              height={45}
              alt="au-connect-logo"
            />
            <h1 className="text-lg font-bold text-gray-900">AU Connect</h1>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 text-gray-600 rounded-full focus:outline-none focus:border-red-400"
              />
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {/* Nav Links */}
            {[
              {
                href: MAIN_PAGE_PATH,
                icon: <Home className="w-5 h-5" />,
                label: "Home",
              },
              {
                href: CONNECT_PAGE_PATH,
                icon: <UserPlus className="w-5 h-5" />,
                label: "Connect",
              },
              {
                href: MESSAGES_PAGE_PATH,
                icon: <MessageCircleMore className="w-5 h-5" />,
                label: "Messaging",
              },
              {
                href: NOTIFICATION_PAGE_PATH,
                icon: <Bell className="w-5 h-5" />,
                label: "Notification",
              },
            ].map((item, i) => (
              <Link
                key={i}
                title={item.label}
                href={item.href}
                className={`flex flex-col items-center gap-1 ${
                  currentPage === item.href ? "text-red-500" : "text-gray-600"
                } hover:text-red-600`}
              >
                {item.icon}
                <span className="text-xs">{item.label}</span>
              </Link>
            ))}

            {/* Profile + Logout */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleProfileClick}
                disabled={userLoading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:cursor-default disabled:hover:bg-transparent cursor-pointer"
              >
                <div
                  title="Profile"
                  className="relative w-8 h-8 rounded-full overflow-hidden border border-red-300 flex items-center justify-center bg-gray-100"
                >
                  {userLoading ? (
                    <Skeleton className="w-full h-full rounded-full" />
                  ) : (
                    <Image
                      src={resolvedProfilePicUrl}
                      alt="Profile Avatar"
                      fill
                      className="object-cover"
                    />
                  )}
                </div>

                {userLoading ? (
                  <Skeleton className="h-3 w-16" />
                ) : (
                  <span className="text-sm">{user?.username}</span>
                )}
              </button>

              <button
                onClick={() => setShowModal(true)}
                title="Logout from this account"
                disabled={userLoading}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
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

        {/* Mobile Search Bar */}
        <div className="md:hidden mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 text-gray-600 rounded-full focus:outline-none focus:border-red-400"
            />
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
            <div className="flex flex-col gap-3">
              {[
                {
                  href: MAIN_PAGE_PATH,
                  icon: <Home className="w-5 h-5" />,
                  label: "Home",
                },
                {
                  href: CONNECT_PAGE_PATH,
                  icon: <UserPlus className="w-5 h-5" />,
                  label: "Connect",
                },
                {
                  href: MESSAGES_PAGE_PATH,
                  icon: <PlusCircle className="w-5 h-5" />,
                  label: "Post",
                },
                {
                  href: NOTIFICATION_PAGE_PATH,
                  icon: <Bell className="w-5 h-5" />,
                  label: "Notification",
                },
                {
                  href: PROFILE_PAGE_PATH,
                  icon: <UserRound className="w-5 h-5" />,
                  label: "Profile",
                },
              ].map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
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
                onClick={() => setShowModal(true)}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg text-gray-600 hover:text-red-600 curor-pointer`}
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </nav>
        )}

        <LogoutModal
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
