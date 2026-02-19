import { useCallback, useEffect, useState } from "react";

export function useInfiniteScroll({
  enabled,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: {
  enabled: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}) {
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);
  const [sentinelEl, setSentinelEl] = useState<HTMLDivElement | null>(null);

  const rootRef = useCallback((node: HTMLDivElement | null) => {
    setRootEl(node);
  }, []);

  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    setSentinelEl(node);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (!hasNextPage) return;
    if (!rootEl) return;
    if (!sentinelEl) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (!hasNextPage) return;
        if (isFetchingNextPage) return;

        fetchNextPage();
      },
      {
        root: rootEl,
        rootMargin: "800px",
        threshold: 0,
      }
    );

    obs.observe(sentinelEl);
    return () => obs.disconnect();
  }, [enabled, hasNextPage, isFetchingNextPage, fetchNextPage, rootEl, sentinelEl]);

  return { rootRef, sentinelRef };
}
