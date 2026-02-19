import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getHeaderUserInfo } from "@/lib/authFunctions";
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

const MAX_SIZE = 5 * 1024 * 1024;

const allowedTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ jobPostId: string }> },
) {
  try {
    // validate user info from headers
    const [userEmail, applicantId] = getHeaderUserInfo(req);

    if (!userEmail || !applicantId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 },
      );
    }

    const { jobPostId } = await context.params;

    const formData = await req.formData();

    const file = formData.get("resumeFile") as File;
    const resumeLetter = formData.get("resumeLetter") as string | null;
    const expectedSalary = formData.get("expectedSalary") as string | null;
    const availability = formData.get("availability") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Resume required" }, { status: 400 });
    }

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    // Check duplicate
    const existing = await prisma.jobApplication.findUnique({
      where: {
        jobPostId_applicantId: {
          jobPostId,
          applicantId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Already applied" }, { status: 400 });
    }

    // Azure upload
    const credential = new StorageSharedKeyCredential(
      process.env.AZURE_STORAGE_ACCOUNT_NAME!,
      process.env.AZURE_STORAGE_ACCOUNT_KEY!,
    );

    const blobServiceClient = new BlobServiceClient(
      `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
      credential,
    );

    const containerClient = blobServiceClient.getContainerClient(
      process.env.AZURE_STORAGE_CONTAINER_NAME!,
    );

    const blobName = `resumes/${applicantId}/${Date.now()}-${file.name}`;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const buffer = Buffer.from(await file.arrayBuffer());

    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: file.type,
      },
    });

    // Save to database
    const application = await prisma.jobApplication.create({
      data: {
        jobPostId,
        applicantId,
        resumeBlobName: blobName,
        resumeLetter: resumeLetter || undefined,
        expectedSalary: expectedSalary ? Number(expectedSalary) : undefined,
        availability: availability || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      applicationId: application.id,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json({ error: "Failed to apply" }, { status: 500 });
  }
}
