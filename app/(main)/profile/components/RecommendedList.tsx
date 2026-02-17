"use client";

import RecommendedCard from "./RecommendedCard";

export default function RecommendedList({ users, limit }: any) {
  return (
    <div className="space-y-4">
      {users.slice(0, limit).map((user: any) => (
        <RecommendedCard key={user.id} user={user} />
      ))}
    </div>
  );
}
