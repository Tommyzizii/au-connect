"use client";
import { useState, useEffect } from "react";

import LeftProfile from "./components/Feed_LeftProfile";
import MainFeed from "./components/Feed_MainFeed";
import RightEvents from "./components/Feed_RightEvents";
import { ME_API_PATH } from "@/lib/constants";
import User from "@/types/User";

const mockUser = {
  name: "Zai Swan",
  title: "Game Developer",
  education: "Class 2015, School of Science & Technology",
  location: "Bangkok, Thailand",
  avatar: "/au-bg.png",
};

const mockPosts = [
  {
    id: 1,
    author: "Floyd Miles",
    education: "Class 2015, School of Martin De Tours",
    avatar: "/au-bg.png",
    title: "Back To My Graduation Days",
    timestamp: "2h",
    image: "/au-bg.png",
  },
  {
    id: 2,
    author: "Floyd Miles",
    education: "Class 2015, School of Martin De Tours",
    avatar: "/au-bg.png",
    title: "Back To My Graduation Days",
    timestamp: "2h",
    image: "/au-bg.png",
  },
  {
    id: 3,
    author: "Floyd Miles",
    education: "Class 2015, School of Martin De Tours",
    avatar: "/au-bg.png",
    title: "Back T My Graduation Days",
    timestamp: "2h",
    image: "/au-bg.png",
  },
  {
    id: 4,
    author: "Floyd Miles",
    education: "Class 2015, School of Nursing Science",
    avatar: "/au-bg.png",
    timestamp: "5h",
  },
];

const mockEvents = [
  {
    id: 1,
    title: "Loi Krathong",
    location: "Sala Thai",
    date: "Wednesday, 05/11/2025",
  },
  {
    id: 2,
    title: "Christmas Eve",
    location: "SM",
    date: "Wednesday, 25/12/2025",
  },
];

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const res = await fetch(ME_API_PATH, {
          method: "GET",
          credentials: "include",
          cache: 'no-store'
        });

        if (!res.ok) {
          console.error("Failed to fetch user:", res.status);
          setUser(null);
          return;
        }
        
        const data = await res.json();
        console.log("fetched response:", data.user);
        setUser(data.user);
        setLoading(false);
      } catch (err) {
        setLoading(false);
        console.error("Error fetching user:", err);
        setUser(null);
      }
    };

    fetchUser();
    // setTimeout(() => setLoading(false), 1500);
  }, []);

  useEffect(() => {console.log(user)}, [user])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="md:grid md:grid-cols-12 md:gap-6">
        {/* LEFT PROFILE */ }
        <LeftProfile user={user} loading={loading} />

        {/* MAIN FEED */}
        <MainFeed user={mockUser} posts={mockPosts} loading={loading} />

        {/* RIGHT EVENT SIDEBAR */}
        <RightEvents events={mockEvents} loading={loading} />
      </div>
    </div>
  );
}
