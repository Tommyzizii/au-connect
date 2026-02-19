export function formatSmartStamp(iso: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();

    const diffMs = now.getTime() - d.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // within last 7 days => "Monday 3:16 PM"
    if (diffDays < 7) {
      const weekday = d.toLocaleDateString([], { weekday: "long" });
      return `${weekday} ${time}`;
    }

    // older => "2/9 3:16 PM" (month/day)
    const md = d.toLocaleDateString([], { month: "numeric", day: "numeric" });
    return `${md} ${time}`;
  } catch {
    return "";
  }
}

export function formatFullDateTime(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// for separators: "Monday, February 9"
export function formatDayLabel(iso: string) {
  try {
    return new Date(iso).toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}
