export function buildSlug(username: string, id: string) {
  const cleanUsername = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${cleanUsername}-${id}`;
}
