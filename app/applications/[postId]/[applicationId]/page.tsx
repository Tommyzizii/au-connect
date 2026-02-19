
import ApplicantDetailsClient from "@/app/components/ApplicantDetailClient";

export default async function Page({
  params,
}: {
  params: Promise<{ postId: string; applicationId: string }>;
}) {
  const { postId, applicationId } = await params;

  return (
    <ApplicantDetailsClient
      postId={postId}
      applicationId={applicationId}
    />
  );
}