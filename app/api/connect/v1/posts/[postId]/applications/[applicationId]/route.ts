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

    // Azure credential (Shared Key)
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "";

    if (!accountName || !accountKey || !containerName) {
      return NextResponse.json(
        { error: "Azure storage env vars missing" },
        { status: 500 },
      );
    }

    const credential = new StorageSharedKeyCredential(accountName, accountKey);

    /**
     * ✅ For resume PDFs: we want inline viewing + correct content-type.
     * ✅ IMPORTANT: no startsOn -> avoids immediate 403 due to clock skew.
     */
    function generateResumeUrl(blobName: string) {
      const sas = generateBlobSASQueryParameters(
        {
          containerName,
          blobName,
          permissions: BlobSASPermissions.parse("r"),
          // no startsOn (clock skew safe)
          expiresOn: new Date(Date.now() + 60 * 60 * 1000),
          contentDisposition: "inline",
          contentType: "application/pdf",
        },
        credential,
      ).toString();

      return `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sas}`;
    }

    /**
     * ✅ For generic blobs (images, etc.)
     * ✅ IMPORTANT: no forced contentType (otherwise images can break)
     * ✅ no startsOn (clock skew safe)
     */
    function generateBlobReadUrl(blobName: string) {
      const sas = generateBlobSASQueryParameters(
        {
          containerName,
          blobName,
          permissions: BlobSASPermissions.parse("r"),
          // no startsOn
          expiresOn: new Date(Date.now() + 60 * 60 * 1000),
        },
        credential,
      ).toString();

      return `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sas}`;
    }

    // Resume URL (always blob)
    const resumeUrl = generateResumeUrl(application.resumeBlobName);

    // ProfilePic logic
    let profilePicUrl: string | null = null;

    if (application.applicant.profilePic) {
      const pic = application.applicant.profilePic;

      // External image → use as-is
      if (pic.startsWith("http://") || pic.startsWith("https://")) {
        profilePicUrl = pic;
      } else {
        // Blob image → generate SAS (generic)
        profilePicUrl = generateBlobReadUrl(pic);
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

    // Use transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Get existing application
      const existingApplication = await tx.jobApplication.findUnique({
        where: { id: applicationId },
        select: {
          status: true,
          jobPostId: true,
        },
      });

      if (!existingApplication) {
        throw new Error("Application not found");
      }

      const previousStatus = existingApplication.status;

      // Get job post
      const jobPost = await tx.jobPost.findUnique({
        where: { id: existingApplication.jobPostId },
        select: {
          positionsAvailable: true,
          positionsFilled: true,
          status: true,
        },
      });

      if (!jobPost) {
        throw new Error("Job post not found");
      }

      let increment = 0;

      // SHORTLISTED → increment
      if (previousStatus !== "SHORTLISTED" && status === "SHORTLISTED") {
        if (jobPost.positionsFilled >= jobPost.positionsAvailable) {
          throw new Error("No positions available");
        }

        increment = 1;
      }

      // REJECTED → decrement
      if (previousStatus === "SHORTLISTED" && status === "REJECTED") {
        increment = -1;
      }

      // Update application status
      const updatedApplication = await tx.jobApplication.update({
        where: { id: applicationId },
        data: { status },
      });

      // Update positionsFilled if needed
      if (increment !== 0) {
        const updatedJobPost = await tx.jobPost.update({
          where: { id: existingApplication.jobPostId },
          data: {
            positionsFilled: {
              increment,
            },
          },
        });

        // Mark FILLED if full
        if (
          updatedJobPost.positionsFilled >= updatedJobPost.positionsAvailable
        ) {
          await tx.jobPost.update({
            where: { id: existingApplication.jobPostId },
            data: { status: "FILLED" },
          });
        }

        // Reopen if slot freed
        if (
          updatedJobPost.positionsFilled < updatedJobPost.positionsAvailable &&
          updatedJobPost.status === "FILLED"
        ) {
          await tx.jobPost.update({
            where: { id: existingApplication.jobPostId },
            data: { status: "OPEN" },
          });
        }
      }

      return updatedApplication;
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error updating application:", err);

    return NextResponse.json(
      { error: "Failed to update application status" },
      { status: 500 },
    );
  }
}
