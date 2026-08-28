"use client";

import { useEffect } from "react";

import SystemState from "./components/SystemState";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <SystemState
      code="!"
      title="Something went wrong."
      description="An unexpected problem interrupted this page. Try again, or return home if the issue continues."
      onRetry={reset}
      showBack
    />
  );
}
