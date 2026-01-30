import {UPDATE_PROFILE_ABOUT_API_PATH } from "@/lib/constants";
export async function updateAbout(about: string) {
  const res = await fetch(
    UPDATE_PROFILE_ABOUT_API_PATH,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ about }),
    }
  );

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || "Failed to update about");
  }

  return json;
}
