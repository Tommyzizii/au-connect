import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

for (const name of [
  "DATABASE_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "LINKEDIN_CLIENT_ID",
  "LINKEDIN_CLIENT_SECRET",
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET",
  "AZURE_STORAGE_CONNECTION_STRING",
  "JWT_SECRET",
]) {
  process.env[name] ||= "test";
}
process.env.AZURE_STORAGE_ACCOUNT_NAME = "testaccount";
process.env.AZURE_STORAGE_ACCOUNT_KEY = Buffer.alloc(32, 1).toString("base64");
process.env.AZURE_STORAGE_CONTAINER_NAME = "test-container";

test("direct upload SAS can create but cannot overwrite a blob", async () => {
  const { POST } = await import("../app/api/connect/v1/upload-media/route");
  const response = await POST(
    new NextRequest("http://localhost/api/connect/v1/upload-media", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-email": "member@example.com",
        "x-user-id": "a".repeat(24),
      },
      body: JSON.stringify({
        fileName: "photo.jpg",
        fileSize: 1024,
        purpose: "post",
      }),
    }),
  );

  assert.equal(response.status, 200);
  const { uploadUrl } = (await response.json()) as { uploadUrl: string };
  const permissions = new URL(uploadUrl).searchParams.get("sp");
  assert.equal(permissions, "c");
  assert.equal(permissions?.includes("w"), false);
});
