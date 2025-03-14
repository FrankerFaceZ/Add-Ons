export function formatLiveDuration(uptime) {
  const now = new Date();
  const startDate = new Date(uptime);
  const diffMs = now - startDate;

  const seconds = Math.floor(diffMs / 1e3) % 60;
  const minutes = Math.floor(diffMs / (1e3 * 60)) % 60;
  const hours = Math.floor(diffMs / (1e3 * 60 * 60)) % 24;
  const days = Math.floor(diffMs / (1e3 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
  if (seconds > 0) parts.push(`${seconds} second${seconds > 1 ? "s" : ""}`);

  return `${parts.join(", ").replace(/,([^,]*)$/, " and$1")}`;
}

export function formatAccountAge(createdAt) {
  const now = new Date();
  const accountCreationDate = new Date(createdAt);
  const diffMs = now - accountCreationDate;

  const seconds = Math.floor(diffMs / 1e3) % 60;
  const minutes = Math.floor(diffMs / (1e3 * 60)) % 60;
  const hours = Math.floor(diffMs / (1e3 * 60 * 60)) % 24;
  const days = Math.floor(diffMs / (1e3 * 60 * 60 * 24)) % 30;
  const months = Math.floor(diffMs / (1e3 * 60 * 60 * 24 * 30)) % 12;
  const years = Math.floor(diffMs / (1e3 * 60 * 60 * 24 * 30 * 12));

  const parts = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} month${months > 1 ? "s" : ""}`);
  if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
  if (seconds > 0) parts.push(`${seconds} second${seconds > 1 ? "s" : ""}`);

  // If no parts, return "just now"
  if (parts.length === 0) return "just created";

  return parts
    .join(", ")
    .replace(/,([^,]*)$/, " and$1") + " ago";
}

export function formatFollowAge(followedAt) {
  const now = new Date();
  const followDate = new Date(followedAt);
  const diffMs = now - followDate;

  const seconds = Math.floor(diffMs / 1e3) % 60;
  const minutes = Math.floor(diffMs / (1e3 * 60)) % 60;
  const hours = Math.floor(diffMs / (1e3 * 60 * 60)) % 24;
  const days = Math.floor(diffMs / (1e3 * 60 * 60 * 24)) % 30;
  const months = Math.floor(diffMs / (1e3 * 60 * 60 * 24 * 30)) % 12;
  const years = Math.floor(diffMs / (1e3 * 60 * 60 * 24 * 365));

  const parts = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} month${months > 1 ? "s" : ""}`);
  if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
  if (seconds > 0) parts.push(`${seconds} second${seconds > 1 ? "s" : ""}`);

  // If no parts, return "just followed"
  const followDuration =
    parts.length === 0
      ? "just followed"
      : parts.join(", ").replace(/,([^,]*)$/, " and$1");

  return followDuration;
}

// Convert seconds to hh:mm:ss format
export function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  } else if (minutes > 0) {
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  } else {
    return `${secs}s`;
  }
}