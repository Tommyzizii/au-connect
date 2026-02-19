/**
 * file to put all environment variable related code
 **/

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable "${name}" is missing`);
  }
  return value;
}

export const GOOGLE_CLIENT_ID = required("GOOGLE_CLIENT_ID");
export const GOOGLE_CLIENT_SECRET = required("GOOGLE_CLIENT_SECRET");

export const LINKEDIN_CLIENT_ID = required("LINKEDIN_CLIENT_ID");
export const LINKEDIN_CLIENT_SECRET = required("LINKEDIN_CLIENT_SECRET");

export const MICROSOFT_CLIENT_ID = required("MICROSOFT_CLIENT_ID");
export const MICROSOFT_CLIENT_SECRET = required("MICROSOFT_CLIENT_SECRET");

export const AZURE_STORAGE_ACCOUNT_KEY = required("AZURE_STORAGE_ACCOUNT_KEY");
export const AZURE_STORAGE_ACCOUNT_NAME = required(
  "AZURE_STORAGE_ACCOUNT_NAME",
);
export const AZURE_STORAGE_CONNECTION_STRING = required(
  "AZURE_STORAGE_CONNECTION_STRING",
);
export const AZURE_STORAGE_CONTAINER_NAME = required(
  "AZURE_STORAGE_CONTAINER_NAME",
);

export const NEXT_PUBLIC_BASE_URL = required("NEXT_PUBLIC_BASE_URL");
export const NODE_ENV = process.env.NODE_ENV || "development";

export const GOOGLE_REDIRECT_URI =
  NEXT_PUBLIC_BASE_URL + "/api/connect/v1/auth/google/callback";
export const LINKEDIN_REDIRECT_URI =
  NEXT_PUBLIC_BASE_URL + "/api/connect/v1/auth/linkedin/callback";
export const MICROSOFT_REDIRECT_URI =
  NEXT_PUBLIC_BASE_URL + "/api/connect/v1/auth/azure-ad/callback";
export const JWT_SECRET = required("JWT_SECRET");
