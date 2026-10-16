"use client";

import { Clock } from "lucide-react";
import { useCurrentTime } from "@/lib/client/useCurrentTime";

interface PostPollReadOnlyProps {
  options: string[];
  votes?: Record<string, string[]>;
  endsAt?: Date;
}

export default function PostPollView({
  options,
  votes = {},
  endsAt,
}: PostPollReadOnlyProps) {
  const currentTime = useCurrentTime(Boolean(endsAt));
  const totalVotes = Object.values(votes).reduce(
    (sum, voters) => sum + voters.length,
    0,
  );

  const getVoteCount = (index: number) => votes[index.toString()]?.length || 0;

  const getVotePercentage = (index: number) =>
    totalVotes === 0 ? 0 : Math.round((getVoteCount(index) / totalVotes) * 100);

  const getTimeRemaining = () => {
    if (!endsAt || currentTime === null) return null;
    const diff = new Date(endsAt).getTime() - currentTime;
    if (diff < 0) return "Poll ended";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h left`;
    return `${hours}h left`;
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl border p-10 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            📊 Community Poll
          </h2>

          {endsAt && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              {getTimeRemaining()}
            </div>
          )}
        </div>

        {/* Options */}
        <div className="space-y-4">
          {options.map((option, index) => {
            const percentage = getVotePercentage(index);
            const voteCount = getVoteCount(index);

            return (
              <div
                key={index}
                className="relative overflow-hidden rounded-2xl border bg-neutral-50 h-16"
              >
                {/* Progress */}
                <div
                  className="absolute inset-y-0 left-0 bg-blue-200"
                  style={{ width: `${percentage}%` }}
                />

                <div className="relative px-6 h-full flex justify-between items-center">
                  <span className="text-base font-medium text-gray-900">
                    {option}
                  </span>

                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">{voteCount} votes</span>
                    <span className="font-semibold text-gray-900">
                      {percentage}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-sm text-gray-500 pt-4 border-t">
          <span>{totalVotes} total votes</span>
          <span>Results are final</span>
        </div>
      </div>
    </div>
  );
}
