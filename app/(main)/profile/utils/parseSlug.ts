export function parseSlug(slug?: string) {
  if (!slug) {
    return { username: "", id: "" };
  }

  const parts = slug.split("-");
  const id = parts.pop() || "";
  const username = parts.join("-");

  return { username, id };
}
