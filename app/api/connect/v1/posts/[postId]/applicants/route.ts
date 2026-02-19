import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getHeaderUserInfo } from "@/lib/authFunctions"; // your auth util
import {
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from "@azure/storage-blob";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 },
      );
    }

    const { postId } = await context.params;
    console.log("PHASE 1");

    // verify ownership
    const jobPost = await prisma.jobPost.findUnique({
      where: {
        postId: postId,
      },
      select: {
        id: true,
        post: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!jobPost) {
      return NextResponse.json(
        { error: "Job post not found" },
        { status: 404 },
      );
    }

    if (jobPost.post.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("PHASE 2");
    const applications = await prisma.jobApplication.findMany({
      where: {
        jobPostId: jobPost.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        applicant: {
          select: {
            id: true,
            username: true,
            email: true,
            profilePic: true,
            title: true,
            location: true,
          },
        },
      },
    });

    const applicationsWithSas = applications.map((application) => ({
      ...application,
      applicant: {
        ...application.applicant,
        profilePic: getProfilePicUrl(application.applicant.profilePic),
      },
    }));

    return NextResponse.json({
      applications: applicationsWithSas,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to fetch applicants" },
      { status: 500 },
    );
  }
}

const ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
const KEY = process.env.AZURE_STORAGE_ACCOUNT_KEY!;
const CONTAINER = process.env.AZURE_STORAGE_CONTAINER_NAME!;
const EXPIRE = Number(process.env.SAS_TOKEN_EXPIRE_DURATION || 3600000);

const sharedKeyCredential = new StorageSharedKeyCredential(ACCOUNT, KEY);

export function getProfilePicUrl(profilePic?: string | null) {
  if (!profilePic) return null;

  // Already full URL → return as-is
  if (profilePic.startsWith("http://") || profilePic.startsWith("https://")) {
    return profilePic;
  }

  // Otherwise assume Azure blob name → generate SAS
  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER,
      blobName: profilePic,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn: new Date(Date.now() + EXPIRE),
    },
    sharedKeyCredential,
  ).toString();

  return `https://${ACCOUNT}.blob.core.windows.net/${CONTAINER}/${profilePic}?${sasToken}`;
}
