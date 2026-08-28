"use client";

import { useEffect } from "react";

import SystemState from "./components/SystemState";
import "./globals.css";

export default function GlobalError({
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
    <html lang="en">
      <body>
        <main className="min-h-screen">
          <SystemState
            code="!"
            title="AU Connect is unavailable."
            description="We hit a problem while opening AU Connect. Try reloading the app; your account and content are safe."
            onRetry={reset}
          />
        </main>
      </body>
    </html>
  );
}
