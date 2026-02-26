import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import prisma from "../lib/prisma";
import SessionMethod from "../enums/SessionMethod";
import {
  JWT_COOKIE,
  JWT_COOKIE_EXPIRATION_TIME,
  GOOGLE_ACCESS_TOKEN_URL,
  GOOGLE_USERINFO_URL,
  LINKEDIN_ACCESS_TOKEN_URL,
  LINKEDIN_USERINFO_URL,
  OAUTH_STATE_COOKIE_EXPIRATION_TIME,
  OAUTH_STATE_COOKIE,
  SIGNIN_PAGE_PATH,
  MICROSOFT_ACCESS_TOKEN_URL,
  MICROSOFT_USERINFO_URL,
  EXTENSIONS,
} from "./constants";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  JWT_SECRET,
  LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET,
  LINKEDIN_REDIRECT_URI,
  MICROSOFT_CLIENT_ID,
  MICROSOFT_CLIENT_SECRET,
  MICROSOFT_REDIRECT_URI,
  NODE_ENV,
  AZURE_STORAGE_CONNECTION_STRING,
  AZURE_STORAGE_CONTAINER_NAME,
} from "./env";

import { BlobServiceClient } from "@azure/storage-blob";

// TODO: check for errors from providers in each function
// TODO: google and linkedin are missing error handline for fetching token
// TODO: error handling missing for all auth callback function for user info fetching
export async function googleAuthSignIn(req: NextRequest) {
  // the url from google
  const url = new URL(req.url);
  // gets the code containing the authorization data
  const code = url.searchParams.get("code");

  // verify state to prevent CSRF
  verifyOauthState(url, req);

  if (!code) return responseJSON("No code", 400);

  // Exchange code for access token
  const tokenRes = await fetch(GOOGLE_ACCESS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: GOOGLE_REDIRECT_URI,
    }),
  });

  const tokenData = await tokenRes.json();

  // Fetch user info
  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const profile = await userRes.json();

  // check if user exists
  let user = await checkExistUser(profile.email);

  // if user does not exist create new user record
  if (!user) {
    // Pattern A: import provider avatar into Azure (new users only)
    const providerAvatarUrl: string | null =
      typeof profile.picture === "string" ? profile.picture : null;
    // not filtered out by isDefaultPicture()
    const importedBlobName = providerAvatarUrl
      ? await importProviderAvatarToAzure(providerAvatarUrl)
      : null;

    user = await prisma.user.create({
      data: {
        username: profile.name,
        email: profile.email,
        googleId: profile.sub,

        // store blobName (internal) for both
        profilePic: importedBlobName ?? null,
        profilePicOriginal: importedBlobName ?? null,
        profilePicCrop: null,
      },
    });
  } else {
    let profilePic: string | null = user.profilePic;

    // ✅ If DB currently stores provider URL, import to Azure once and replace it
    if (profilePic && profilePic.startsWith("https://lh3.googleusercontent.com/")) {
      const importedFromDb = await importProviderAvatarToAzure(profilePic);
      if (importedFromDb) profilePic = importedFromDb;
    }

    // if the user had a default picture, update it
    if (!user.profilePic || isDefaultPicture(user.profilePic)) {
      // but only if the picture from google is not default, use it
      if (!isDefaultPicture(profile.picture)) {
        // Import provider avatar into Azure and store the blobName instead.
        const providerAvatarUrl: string | null =
          typeof profile.picture === "string" ? profile.picture : null;
        const importedBlobName = providerAvatarUrl
          ? await importProviderAvatarToAzure(providerAvatarUrl)
          : null;

        // if Azure import worked, use blobName; otherwise keep existing picture
        if (importedBlobName) {
          profilePic = importedBlobName;
        }
      }
      // else keep existing picture
    }

    user = await prisma.user.update({
      where: { email: profile.email },
      data: {
        googleId: profile.sub,
        profilePic: profilePic,
        profilePicOriginal: profilePic,
      },
    });
  }

  return createUserSession(
    { id: user.id, email: user.email },
    SessionMethod.SIGN_IN_GOOGLE
  );
}

export async function linkedinAuthSignIn(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  // const state = url.searchParams.get("state");

  // verify state to prevent CSRF
  verifyOauthState(url, req);

  if (!code) return responseJSON("Missing code", 400);

  // Exchange code for access token
  const tokenRes = await fetch(LINKEDIN_ACCESS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: LINKEDIN_REDIRECT_URI,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET,
    }),
  });

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) return responseJSON("Token exchange failed", 400);

  // fetch user info via OIDC
  const infoRes = await fetch(LINKEDIN_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const userInfo = await infoRes.json();

  // check if user exists
  let user = await checkExistUser(userInfo.email);

  // if user does not exist create new user record
  if (!user) {
    //  Pattern A: import provider avatar into Azure (new users only)
    const providerAvatarUrl = getLinkedInAvatarUrl(userInfo);
    const importedBlobName = providerAvatarUrl
      ? await importProviderAvatarToAzure(providerAvatarUrl)
      : null;

    user = await prisma.user.create({
      data: {
        username: userInfo.name,
        email: userInfo.email,
        linkedinId: userInfo.sub,

        // store blobName (internal) for both
        profilePic: importedBlobName ?? null,
        profilePicOriginal: importedBlobName ?? null,
        profilePicCrop: null,
      },
    });
  } else {
    // update existing user with LinkedIn ID
    let profilePic: string | null = user.profilePic;

    // if the user had a default picture, update it
    if (!user.profilePic || isDefaultPicture(user.profilePic)) {
      // but only if the picture from linkedin is not default, use it
      if (!isDefaultPicture(userInfo.picture)) {
        // Import provider avatar into Azure and store the blobName instead.
        const providerAvatarUrl = getLinkedInAvatarUrl(userInfo);

        const importedBlobName = providerAvatarUrl
          ? await importProviderAvatarToAzure(providerAvatarUrl)
          : null;

        // if Azure import worked, use blobName; otherwise keep existing picture
        if (importedBlobName) {
          profilePic = importedBlobName;
        }
      }
      // else keep existing picture
    }

    user = await prisma.user.update({
      where: { email: userInfo.email },
      data: {
        linkedinId: userInfo.sub,
        // only update profile picture if it's not a default avatar
        profilePic: profilePic,
        profilePicOriginal: profilePic,
      },
    });
  }

  // Create a login session
  return createUserSession(
    { id: user.id, email: user.email },
    SessionMethod.SIGN_IN_LINKEDIN
  );
}

export async function azurezAdAuthSignIn(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");

  // verify state to prevent CSRF
  verifyOauthState(req.nextUrl, req);

  if (!code) {
    return NextResponse.redirect(
      `${SIGNIN_PAGE_PATH}?error=No authorization code received`
    );
  }

  try {
    // exchange authorization code for access token
    const tokenResponse = await fetch(MICROSOFT_ACCESS_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        code: code,
        redirect_uri: MICROSOFT_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(
        `Token exchange failed: ${errorData.error_description || errorData.error
        }`
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // get user info from Microsoft Graph API
    const userResponse = await fetch(MICROSOFT_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error("Failed to fetch user info from Microsoft Graph");
    }

    const userData = await userResponse.json();

    console.log("SERVER SIDE LOG:\nMicrosoft User Info:", userData);

    // check if user exists
    let user = await checkExistUser(userData.mail);

    // ✅ Microsoft profile photo import into Azure (same pattern as Google/LinkedIn)
    const importedMicrosoftBlobName = await importMicrosoftAvatarToAzure(accessToken);

    // if user does not exist create new user record
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userData.mail,
          username: userData.displayName,
          microsoftId: userData.id,
          phoneNo: userData.mobilePhone,

          // store blobName (internal) for both
          profilePic: importedMicrosoftBlobName ?? null,
          profilePicOriginal: importedMicrosoftBlobName ?? null,
          profilePicCrop: null,
        },
      });
    } else {
      // update if doesn't exist
      let profilePic: string | null = user.profilePic;

      // only set if missing/default and we successfully imported
      if ((!profilePic || isDefaultPicture(profilePic)) && importedMicrosoftBlobName) {
        profilePic = importedMicrosoftBlobName;
      }

      user = await prisma.user.update({
        where: { email: userData.mail },
        data: {
          microsoftId: userData.id,
          phoneNo: userData.mobilePhone,

          // keep profile pictures in sync
          profilePic: profilePic,
          profilePicOriginal: profilePic,
        },
      });
    }

    return createUserSession(
      { id: user.id, email: user.email },
      SessionMethod.SIGN_IN_MICROSOFT
    );
  } catch (error) {
    console.error("Microsoft OAuth callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/register?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Authentication failed"
      )}`
    );
  }
}

export function createOauthStateCookie(res: NextResponse, state: string) {
  return res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax",
    maxAge: OAUTH_STATE_COOKIE_EXPIRATION_TIME, // 10 minutes
  });
}

export function isSecureCookie() {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "";

  return baseUrl.startsWith("https://");
}

function verifyOauthState(url: URL, req: NextRequest) {
  const state = url.searchParams.get("state");
  const storedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!state || state !== storedState) {
    throw new Error("Invalid state parameter");
  }
}

export function verifyJwtToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
    };
    return decoded;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Invalid token");
  }
}

// checks email only
export async function checkExistUser(email: string) {
  return await prisma.user.findUnique({
    where: { email: email },
  });
}

export function createUserSession(
  user: { id: string; email: string },
  method: SessionMethod
) {
  // create JWT token
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_COOKIE_EXPIRATION_TIME,
  });

  const response = getResponse(method);

  if (response) {
    // delete oauth state cookie
    response.cookies.delete(OAUTH_STATE_COOKIE);

    // set the JWT in the cookie
    response.cookies.set({
      name: JWT_COOKIE,
      value: token,
      httpOnly: true,
      secure: isSecureCookie(),
      maxAge: JWT_COOKIE_EXPIRATION_TIME,
    });
  }

  return response;
}

function getResponse(method: SessionMethod) {
  switch (method) {
    case SessionMethod.LOGOUT:
      return NextResponse.json(
        { message: "Logged out successfully" },
        { status: 200 }
      );
    case SessionMethod.SIGN_IN_GOOGLE:
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/?success=true&provider=google`
      );
    case SessionMethod.SIGN_IN_LINKEDIN:
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/?success=true&provider=linkedin`
      );
    case SessionMethod.SIGN_IN_MICROSOFT:
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/?success=true&provider=microsoft`
      );
    default:
    // TODO: add default response ?
  }
}

function responseJSON(message: string, statusCode: number) {
  return NextResponse.json({ message: message }, { status: statusCode });
}

function isDefaultPicture(imageString: string | null) {
  if (!imageString) return false;

  return (
    imageString.startsWith("https://lh3.googleusercontent.com/") ||
    imageString.startsWith("https://media.licdn.com/dms/image/")
  );
}

export function getHeaderUserInfo(req: NextRequest) {
  return [req.headers.get("x-user-email"), req.headers.get("x-user-id")];
}

/**
 *  Provider avatar → Azure import (new users only)
 * - downloads provider image
 * - validates type & size
 * - uploads to Azure as blob
 * - returns blobName
 */
async function importProviderAvatarToAzure(
  imageUrl: string
): Promise<string | null> {
  try {
    const normalizedImageUrl = normalizeProviderAvatarUrl(imageUrl);

    // fetch provider image
    const res = await fetch(normalizedImageUrl);

    if (!res.ok) {
      // console.log("Failed to fetch provider avatar:", res.status);
      return null;
    }

    const contentType = res.headers.get("content-type") || "";
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(contentType)) {
      // console.log("Provider avatar type not allowed:", contentType);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();

    // max 5MB
    const maxBytes = 5 * 1024 * 1024;
    if (arrayBuffer.byteLength > maxBytes) {
      // console.log("Provider avatar too large:", arrayBuffer.byteLength);
      return null;
    }

    const extension = EXTENSIONS[contentType] || ".jpg";
    const blobName = `images/provider/${crypto.randomUUID()}${extension}`;

    const blobServiceClient = BlobServiceClient.fromConnectionString(
      AZURE_STORAGE_CONNECTION_STRING
    );

    const containerClient = blobServiceClient.getContainerClient(
      AZURE_STORAGE_CONTAINER_NAME
    );

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(Buffer.from(arrayBuffer), {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    });

    return blobName;
  } catch (err) {
    console.log(
      err instanceof Error ? err.message : "Failed to import provider avatar"
    );
    return null;
  }
}

/**
 * Provider avatar URLs can default to tiny thumbnails.
 * Normalize known providers to request higher resolution avatars.
 */
function normalizeProviderAvatarUrl(imageUrl: string): string {
  try {
    // Google avatars: request larger size.
    if (imageUrl.includes("googleusercontent.com")) {
      let normalized = imageUrl
        .replace(/([?&]sz=)\d+/i, "$1512")
        .replace(/=s\d+(-c)?$/i, "=s512-c");

      if (normalized === imageUrl) {
        normalized = imageUrl.includes("?")
          ? `${imageUrl}&sz=512`
          : `${imageUrl}=s512-c`;
      }

      return normalized;
    }

    // LinkedIn avatars: prefer bigger display-photo variant.
    if (imageUrl.includes("media.licdn.com")) {
      return imageUrl.replace(
        /profile-displayphoto-shrink_\d+_\d+/i,
        "profile-displayphoto-shrink_800_800"
      );
    }

    return imageUrl;
  } catch {
    return imageUrl;
  }
}

/**
 * Microsoft profile photo import into Azure
 * - downloads Microsoft Graph photo ($value)
 * - validates type & size
 * - uploads to Azure as blob
 * - returns blobName
 */
async function importMicrosoftAvatarToAzure(
  accessToken: string
): Promise<string | null> {
  try {
    // fetch provider image (Microsoft Graph photo)
    const res = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // 404 means user has no profile photo in Microsoft
    if (res.status === 404) {
      // console.log("Microsoft user has no profile photo");
      return null;
    }

    if (!res.ok) {
      console.log("Failed to fetch Microsoft avatar:", res.status);
      return null;
    }

    const contentType = res.headers.get("content-type") || "";
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(contentType)) {
      console.log("Microsoft avatar type not allowed:", contentType);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();

    // max 5MB
    const maxBytes = 5 * 1024 * 1024;
    if (arrayBuffer.byteLength > maxBytes) {
      console.log("Microsoft avatar too large:", arrayBuffer.byteLength);
      return null;
    }

    const extension = EXTENSIONS[contentType] || ".jpg";
    const blobName = `images/provider/${crypto.randomUUID()}${extension}`;

    const blobServiceClient = BlobServiceClient.fromConnectionString(
      AZURE_STORAGE_CONNECTION_STRING
    );

    const containerClient = blobServiceClient.getContainerClient(
      AZURE_STORAGE_CONTAINER_NAME
    );

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(Buffer.from(arrayBuffer), {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    });

    return blobName;
  } catch (err) {
    console.log(
      err instanceof Error ? err.message : "Failed to import Microsoft avatar"
    );
    return null;
  }
}

/**
 * LinkedIn userinfo picture shape can vary. This safely extracts a usable URL.
 * We only use this for NEW USER avatar import.
 */
function getLinkedInAvatarUrl(userInfo: any): string | null {
  try {
    if (!userInfo) return null;

    // most ideal: direct string
    if (typeof userInfo.picture === "string") return userInfo.picture;

    // common nested structure
    if (
      userInfo.picture?.original?.url &&
      typeof userInfo.picture.original.url === "string"
    ) {
      return userInfo.picture.original.url;
    }

    // fallback: some providers return { url: "..." }
    if (userInfo.picture?.url && typeof userInfo.picture.url === "string") {
      return userInfo.picture.url;
    }

    return null;
  } catch {
    return null;
  }
}
