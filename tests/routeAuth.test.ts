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

const routeAuthPromise = Promise.all([
  import("../lib/server/routeAuth"),
  import("../lib/server/routeErrors"),
]);

function requestWithToken(token?: string, headers?: HeadersInit) {
  const requestHeaders = new Headers(headers);
  if (token) requestHeaders.set("cookie", `ac_auth_token=${token}`);

  return new NextRequest("http://localhost/api/connect/v1/example", {
    headers: requestHeaders,
  });
}

test("requireRouteAuth returns validated identity claims", async () => {
  const [{ requireRouteAuth }] = await routeAuthPromise;
  const token = jwt.sign(
    { userId: "user-123", email: "member@example.com" },
    process.env.JWT_SECRET!,
  );

  assert.deepEqual(requireRouteAuth(requestWithToken(token)), {
    userId: "user-123",
    email: "member@example.com",
  });
});

test("requireRouteAuth rejects requests without a session cookie", async () => {
  const [{ requireRouteAuth }, { AuthenticationError }] = await routeAuthPromise;

  assert.throws(
    () => requireRouteAuth(requestWithToken()),
    AuthenticationError,
  );
});

test("requireRouteAuth ignores spoofed identity headers", async () => {
  const [{ requireRouteAuth }, { AuthenticationError }] = await routeAuthPromise;
  const req = requestWithToken(undefined, {
    "x-user-id": "victim-id",
    "x-user-email": "victim@example.com",
  });

  assert.throws(() => requireRouteAuth(req), AuthenticationError);
});

test("requireRouteAuth rejects invalid and expired tokens", async () => {
  const [{ requireRouteAuth }, { AuthenticationError }] = await routeAuthPromise;
  const expiredToken = jwt.sign(
    { userId: "user-123", email: "member@example.com" },
    process.env.JWT_SECRET!,
    { expiresIn: -1 },
  );

  assert.throws(
    () => requireRouteAuth(requestWithToken("not-a-jwt")),
    AuthenticationError,
  );
  assert.throws(
    () => requireRouteAuth(requestWithToken(expiredToken)),
    AuthenticationError,
  );
});

test("requireRouteAuth rejects signed tokens with missing identity claims", async () => {
  const [{ requireRouteAuth }, { AuthenticationError }] = await routeAuthPromise;
  const missingEmail = jwt.sign(
    { userId: "user-123" },
    process.env.JWT_SECRET!,
  );

  assert.throws(
    () => requireRouteAuth(requestWithToken(missingEmail)),
    AuthenticationError,
  );
});
