import type User from "@/types/User";

export interface UpdateProfilePayload {
  username: string;
  title?: string;
  about?: string;
  location?: string;
  phoneNo?: string;
  phonePublic?: boolean;
  emailPublic?: boolean;
}

export async function updateMyProfile(data: UpdateProfilePayload): Promise<User> {
  const res = await fetch("/api/connect/v1/profile/me/update/generalFields", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || "Update failed");
  }

  return json.user as User;
}
