import ApplicantsPageClient from "@/app/components/ApplicantsPageClient";

export default async function ApplicantPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  return <ApplicantsPageClient postId={postId} />;
}