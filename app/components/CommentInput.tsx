"use client";
import { SendHorizontal, Loader2 } from "lucide-react";
import { useState } from "react";

export default function CommentInput({
  isLoading = false,
  onSubmit,
  placeholder = "Add a comment...",
}: {
  isLoading?: boolean;
  onSubmit: (text: string) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (!text.trim() || isLoading) return;
    onSubmit(text.trim());
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isDisabled = !text.trim() || isLoading;

  return (
    <div className="flex items-end gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        disabled={isLoading}
        className="flex-1 resize-none text-sm text-gray-900 outline-none bg-transparent disabled:opacity-50"
      />

      <button
        onClick={handleSubmit}
        disabled={isDisabled}
        className={`text-sm font-semibold ${
          isDisabled
            ? "text-gray-400 cursor-default"
            : "text-blue-500 hover:text-blue-600 cursor-pointer"
        }`}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <SendHorizontal className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
