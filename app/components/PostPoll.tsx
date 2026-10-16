// components/PostPoll.tsx
"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { useVoteInPoll } from "../(main)/profile/utils/fetchfunctions";
import { useCurrentTime } from "@/lib/client/useCurrentTime";

interface PostPollProps {
  postId: string;
  options: string[];
  votes?: Record<string, string[]>; // { "0": ["userId1"], "1": ["userId2"] }
  endsAt?: Date;
  currentUserId?: string;
  /** When true, voting is closed for this view (e.g. read-only community page feed). */
  votingDisabled?: boolean;
}

export default function PostPoll({
  postId,
  options,
  votes = {},
  endsAt,
  currentUserId,
  votingDisabled = false,
}: PostPollProps) {
  const voteMutation = useVoteInPoll(postId, currentUserId ?? "");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const currentTime = useCurrentTime(Boolean(endsAt));

  if (!currentUserId) return null;

  // Calculate if poll has ended
  const clockReady = !endsAt || currentTime !== null;
  const pollEnded = Boolean(
    endsAt && currentTime !== null && new Date(endsAt).getTime() <= currentTime,
  );

  // Calculate total votes
  const totalVotes = Object.values(votes).reduce(
    (sum, voters) => sum + voters.length,
    0,
  );

  // Check if current user has voted
  const userVotedOption = Object.entries(votes).find(([, voters]) =>
    voters.includes(currentUserId),
  )?.[0];

  const userHasVoted = !!userVotedOption || hasVoted;

  const handleVote = (optionIndex: number) => {
    if (!clockReady || pollEnded || userHasVoted || votingDisabled) return;

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
    if (!endsAt || currentTime === null) return null;
    const end = new Date(endsAt);
    const diff = end.getTime() - currentTime;

    if (diff < 0) return "Poll ended";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    return "Less than 1h left";
  };

  return (
    <div className="px-3 py-4 sm:px-5">
      <div className="space-y-3">
        {options.map((option, index) => {
          const percentage = getVotePercentage(index);
          const voteCount = getVoteCount(index);
          const isSelected =
            selectedOption === index || userVotedOption === index.toString();
          const showResults = userHasVoted || pollEnded || votingDisabled;

          return (
            <button
              key={index}
              onClick={() => handleVote(index)}
              disabled={!clockReady || userHasVoted || pollEnded || votingDisabled}
              className={`w-full min-w-0 text-left relative overflow-hidden rounded-xl border-2 transition-all ${
                showResults
                  ? isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-neutral-200 bg-white"
                  : "border-neutral-300 hover:border-blue-400 hover:bg-blue-50 "
              } ${(!clockReady || userHasVoted || pollEnded || votingDisabled) && "cursor-default"}`}
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
              <div className="relative flex min-w-0 items-center justify-between gap-2 px-3 py-3 sm:px-4">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
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
                    className={`min-w-0 break-words text-sm font-medium ${
                      isSelected ? "text-blue-900" : "text-gray-700"
                    }`}
                  >
                    {option}
                  </span>
                </div>

                {showResults && (
                  <div className="flex shrink-0 flex-col items-end gap-0 sm:flex-row sm:items-center sm:gap-3">
                    <span className="text-[11px] leading-tight text-gray-500 sm:text-xs">
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
        {endsAt && !votingDisabled && (
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{getTimeRemaining()}</span>
          </div>
        )}
      </div>

      {votingDisabled && !userHasVoted && (
        <p className="mt-2 text-xs text-gray-500">
          Voting is closed on the community page. Open the post to vote.
        </p>
      )}
    </div>
  );
}
