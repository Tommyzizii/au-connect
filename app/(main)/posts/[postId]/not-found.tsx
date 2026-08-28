import SystemState from "@/app/components/SystemState";

export default function PostNotFoundPage() {
  return (
    <SystemState
      code="404"
      title="Post not available."
      description="This post may have been deleted or the link is no longer valid."
      hideChrome
    />
  );
}
