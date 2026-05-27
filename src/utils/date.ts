export function nowIso() {
  return new Date().toISOString();
}

export function formatRelativeTime(value?: string | null) {
  if (!value) {
    return "Not opened";
  }

  const timestamp = new Date(value).getTime();
  const diff = Date.now() - timestamp;

  if (Number.isNaN(timestamp) || diff < 0) {
    return "Just now";
  }

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diff < minute) {
    return "Just now";
  }

  if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `${minutes} min ago`;
  }

  if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (diff < week) {
    const days = Math.floor(diff / day);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
