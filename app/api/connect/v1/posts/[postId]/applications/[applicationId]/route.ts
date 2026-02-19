import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getHeaderUserInfo } from "@/lib/authFunctions";

import {
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ postId: string; applicationId: string }> },
) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId, applicationId } = await context.params;

    // Verify ownership
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (!post || post.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        jobPost: {
          select: {
            id: true,
            postId: true,
          },
        },
        applicant: {
          select: {
            id: true,
            username: true,
            email: true,
            profilePic: true,
            title: true,
            location: true,
            phoneNo: true,
            phonePublic: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }

    if (application.jobPost.postId !== postId) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Azure credential
    const credential = new StorageSharedKeyCredential(
      process.env.AZURE_STORAGE_ACCOUNT_NAME!,
      process.env.AZURE_STORAGE_ACCOUNT_KEY!,
    );

    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME!;
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;

    function generateBlobUrl(blobName: string) {
      const sas = generateBlobSASQueryParameters(
        {
          containerName,
          blobName,
          permissions: BlobSASPermissions.parse("r"),
          startsOn: new Date(),
          expiresOn: new Date(Date.now() + 3600 * 1000),

          contentDisposition: "inline",
          contentType: "application/pdf",
        },
        credential,
      ).toString();

      return `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sas}`;
    }

    // Resume URL (always blob)
    const resumeUrl = generateBlobUrl(application.resumeBlobName);

    // ProfilePic logic
    let profilePicUrl = null;

    if (application.applicant.profilePic) {
      const pic = application.applicant.profilePic;

      if (pic.startsWith("http://") || pic.startsWith("https://")) {
        // External image → use as-is
        profilePicUrl = pic;
      } else {
        // Blob image → generate SAS
        profilePicUrl = generateBlobUrl(pic);
      }
    }

    return NextResponse.json({
      ...application,
      resumeUrl,
      applicant: {
        ...application.applicant,
        profilePic: profilePicUrl,
      },
    });
  } catch (err) {
    console.error("Error fetching application:", err);

    return NextResponse.json(
      { error: "Failed to fetch application" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ postId: string; applicationId: string }> },
) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId, applicationId } = await context.params;

    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: "Status required" }, { status: 400 });
    }

    // Verify ownership
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (!post || post.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update application
    const updated = await prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Error updating application:", err);

    return NextResponse.json(
      { error: "Failed to update application status" },
      { status: 500 },
    );
  }
}
