import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

for (const name of [
  "DATABASE_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "LINKEDIN_CLIENT_ID",
  "LINKEDIN_CLIENT_SECRET",
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET",
  "AZURE_STORAGE_ACCOUNT_KEY",
  "AZURE_STORAGE_ACCOUNT_NAME",
  "AZURE_STORAGE_CONNECTION_STRING",
  "AZURE_STORAGE_CONTAINER_NAME",
  "JWT_SECRET",
]) {
  process.env[name] ||= "test";
}

const objectId = "a".repeat(24);
type NextRequestInit = ConstructorParameters<typeof NextRequest>[1];

const routesPromise = Promise.all([
  import("../app/api/connect/v1/connect/status/route"),
  import("../app/api/connect/v1/connect/request/route"),
  import("../app/api/connect/v1/connect/request/[id]/accept/route"),
  import("../app/api/connect/v1/connect/request/[id]/cancel/route"),
  import("../app/api/connect/v1/connect/request/[id]/decline/route"),
  import("../app/api/connect/v1/connect/[userId]/route"),
  import("../app/api/connect/v1/connect/requests/route"),
  import("../app/api/connect/v1/connect/my-connections/route"),
]);

function request(path: string, init?: NextRequestInit) {
  return new NextRequest(`http://localhost${path}`, init);
}

function authenticatedRequest(path: string, init?: NextRequestInit) {
  const token = jwt.sign(
    { userId: objectId, email: "member@example.com" },
    process.env.JWT_SECRET!,
  );
  const headers = new Headers(init?.headers);
  headers.set("cookie", `ac_auth_token=${token}`);
  return request(path, { ...init, headers });
}

test("connection routes return 401 for missing authentication", async () => {
  const [
    statusRoute,
    requestRoute,
    acceptRoute,
    cancelRoute,
    declineRoute,
    removeRoute,
    requestsRoute,
    myConnectionsRoute,
  ] = await routesPromise;

  const responses = await Promise.all([
    statusRoute.GET(request("/connect/status?otherUserId=" + objectId)),
    requestRoute.POST(request("/connect/request", { method: "POST" })),
    acceptRoute.POST(request("/connect/request/id/accept", { method: "POST" }), {
      params: Promise.resolve({ id: objectId }),
    }),
    cancelRoute.POST(request("/connect/request/id/cancel", { method: "POST" }), {
      params: Promise.resolve({ id: objectId }),
    }),
    declineRoute.POST(request("/connect/request/id/decline", { method: "POST" }), {
      params: Promise.resolve({ id: objectId }),
    }),
    removeRoute.DELETE(request("/connect/user", { method: "DELETE" }), {
      params: Promise.resolve({ userId: objectId }),
    }),
    requestsRoute.GET(request("/connect/requests?type=incoming")),
    myConnectionsRoute.GET(request("/connect/my-connections")),
  ]);

  for (const response of responses) {
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
  }
});

test("connection request rejects malformed bodies as client errors", async () => {
  const [, requestRoute] = await routesPromise;

  const malformed = await requestRoute.POST(
    authenticatedRequest("/connect/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    }),
  );
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), {
    error: "A valid toUserId is required",
  });

  const invalidId = await requestRoute.POST(
    authenticatedRequest("/connect/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ toUserId: "not-an-object-id" }),
    }),
  );
  assert.equal(invalidId.status, 400);
});

test("unexpected route errors return a generic 500 response", async (t) => {
  const { routeErrorResponse } = await import("../lib/server/routeErrors");
  t.mock.method(console, "error", () => undefined);

  const response = routeErrorResponse(
    new Error("database credentials and internal details"),
    "Test operation failed",
  );

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Internal server error" });
});
