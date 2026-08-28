import type { Metadata } from "next";

import SystemState from "./components/SystemState";

export const metadata: Metadata = {
  title: "Page not found | AU Connect",
};

export default function NotFound() {
  return (
    <SystemState
      code="404"
      title="Page not found."
      description="This route doesn’t belong to AU Connect. The address may be incorrect, or the page may have moved."
      hideChrome
    />
  );
}
