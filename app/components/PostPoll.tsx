// components/PostPoll.tsx
"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { useVoteInPoll } from "../(main)/profile/utils/fetchfunctions";

interface PostPollProps {
  postId: string;
  options: string[];
  votes?: Record<string, string[]>; // { "0": ["userId1"], "1": ["userId2"] }
  endsAt?: Date;
  currentUserId?: string;
}

export default function PostPoll({
  postId,
  options,
  votes = {},
  endsAt,
  currentUserId,
}: PostPollProps) {
  if (!currentUserId) return null;

  const voteMutation = useVoteInPoll(postId, currentUserId);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  // Calculate if poll has ended
  const pollEnded = endsAt ? new Date(endsAt) < new Date() : false;

  // Calculate total votes
  const totalVotes = Object.values(votes).reduce(
    (sum, voters) => sum + voters.length,
    0,
  );

  // Check if current user has voted
  const userVotedOption = Object.entries(votes).find(([_, voters]) =>
    voters.includes(currentUserId || ""),
  )?.[0];

  const userHasVoted = !!userVotedOption || hasVoted;

  const handleVote = (optionIndex: number) => {
    if (pollEnded || userHasVoted) return;

    setSelectedOption(optionIndex);
    setHasVoted(true);

    voteMutation.mutate(optionIndex, {
      onError: () => {
        setHasVoted(false);
        setSelectedOption(null);
      },
    });
  };

  const getVoteCount = (index: number) => votes[index]?.length || 0;

  const getVotePercentage = (index: number) =>
    totalVotes === 0 ? 0 : Math.round((getVoteCount(index) / totalVotes) * 100);

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!endsAt) return null;
    const now = new Date();
    const end = new Date(endsAt);
    const diff = end.getTime() - now.getTime();

    if (diff < 0) return "Poll ended";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    return "Less than 1h left";
  };

  return (
    <div className="px-5 py-4">
      <div className="space-y-3">
        {options.map((option, index) => {
          const percentage = getVotePercentage(index);
          const voteCount = getVoteCount(index);
          const isSelected =
            selectedOption === index || userVotedOption === index.toString();
          const showResults = userHasVoted || pollEnded;

          return (
            <button
              key={index}
              onClick={() => handleVote(index)}
              disabled={userHasVoted || pollEnded}
              className={`w-full text-left relative overflow-hidden rounded-xl border-2 transition-all ${
                showResults
                  ? isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-neutral-200 bg-white"
                  : "border-neutral-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
              } ${(userHasVoted || pollEnded) && "cursor-default"}`}
            >
              {/* Progress bar background */}
              {showResults && (
                <div
                  className={`absolute inset-0 ${
                    isSelected ? "bg-blue-100" : "bg-neutral-100"
                  } transition-all duration-500 ease-out`}
                  style={{ width: `${percentage}%` }}
                />
              )}

              {/* Content */}
              <div className="relative px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {showResults ? (
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? "border-blue-600 bg-blue-600"
                          : "border-neutral-400"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-neutral-400" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      isSelected ? "text-blue-900" : "text-gray-700"
                    }`}
                  >
                    {option}
                  </span>
                </div>

                {showResults && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                      {voteCount} {voteCount === 1 ? "vote" : "votes"}
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        isSelected ? "text-blue-700" : "text-gray-700"
                      }`}
                    >
                      {percentage}%
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Poll footer */}
      <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
        <span>
          {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        </span>
        {endsAt && (
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{getTimeRemaining()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
