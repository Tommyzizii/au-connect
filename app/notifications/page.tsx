"use client";
import { useState } from "react";
import Image from 'next/image'

export const mockNotifications = [
  {
    id: "1",
    title: "New Connection Request",
    content: "Alex Johnson wants to connect with you.",
    avatar: "/au-bg.png",
    timeAgo: "3 mins ago",
  },
  {
    id: "2",
    title: "Your post received a like",
    content: "Maria liked your post: How I learned React in 30 days",
    avatar: "/au-bg.png",
    timeAgo: "12 mins ago",
  },
  {
    id: "3",
    title: "Profile Viewed",
    content: "Someone viewed your profile 5 times this week.",
    avatar: "/au-bg.png",
    timeAgo: "1 hour ago",
  },
  {
    id: "4",
    title: "New Comment",
    content: "Daniel commented on your post: Completely agree with you!",
    avatar: "/au-bg.png",
    timeAgo: "2 hours ago",
  },
  {
    id: "5",
    title: "Job Alert",
    content: "New recommended role: Frontend Developer at SoftVision.",
    avatar: "/au-bg.png",
    timeAgo: "Yesterday",
  },
];

function NotificationsPage() {
  const [numOfNotifications, setNumOfNotifications] = useState(3);

  return (
    <div className="h-full overflow-y-auto flex flex-col items-center pt-6 px-4 sm:pt-8 md:pt-10">
      <div className="flex flex-row justify-start items-center rounded-lg p-4 sm:p-5 md:p-6 w-full sm:w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 gap-2 sm:gap-3 bg-white border-2 border-gray-200">
        <h1 className="text-gray-600 text-2xl sm:text-3xl md:text-4xl font-bold">Inbox</h1>
        {numOfNotifications != 0 && (
          <div className="bg-red-600 flex justify-center rounded-2xl px-2 sm:px-3 py-1 items-center w-fit h-fit">
            <p className="text-white text-xs sm:text-sm">{numOfNotifications} new</p>
          </div>
        )}
      </div>
      
      <div className="w-full sm:w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 mt-4 sm:mt-5 gap-3 sm:gap-4 md:gap-5 flex flex-col">
        {mockNotifications.map((notification) => (
          <div
            key={notification.id}
            className="flex flex-col sm:flex-row items-start sm:items-center w-full bg-white border-2 border-gray-200 p-4 sm:p-5 md:p-7 shadow-xl rounded-2xl"
          >
            <div className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full border-4 border-gray-100 shrink-0 mb-3 sm:mb-0 sm:mr-3 md:mr-4">
              <Image
                src={notification.avatar}
                fill
                alt="Avatar"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row w-full sm:ml-2 md:ml-5 items-start justify-between gap-2 sm:gap-3">
              <div className="flex flex-col justify-start flex-1">
                <h1 className="text-gray-800 font-bold text-lg sm:text-xl md:text-2xl mb-1">
                  {notification.title}
                </h1>
                <p className="text-gray-800 text-sm sm:text-base">{notification.content}</p>
              </div>
              
              <h1 className="text-gray-400 text-sm sm:text-base md:text-xl whitespace-nowrap sm:ml-3 mt-1 sm:mt-0">
                {notification.timeAgo}
              </h1>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationsPage;