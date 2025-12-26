import { useEffect, useRef, useState } from "react";

export default function PostText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    setIsOverflowing(el.scrollHeight > el.clientHeight);
  }, [text]);

  return (
    <div className="mx-5 mb-3">
      <p
        ref={ref}
        className={`font-medium text-gray-900 ${
          expanded ? "" : "line-clamp-2"
        }`}
      >
        {text}
      </p>

      {isOverflowing && (
        <span
          onClick={() => setExpanded(!expanded)}
          className="inline-block text-sm font-medium text-gray-500 cursor-pointer hover:underline"
        >
          {expanded ? "Show less" : "Read more"}
        </span>
      )}
    </div>
  );
}
